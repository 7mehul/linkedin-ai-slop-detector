// SlopShield: scorer.js
// Tokenizes once, runs every signal, applies weights + the broetry×phrases bonus,
// and owns the threshold math. Also home to the pure helpers shared with the DOM
// layer (text serializer, FNV-1a, mulberry32) so they stay Node-testable.
(() => {
  'use strict';
  const SS = (globalThis.SlopShield = globalThis.SlopShield || {});

  const MAX_ANALYZED_CHARS = 2500;
  const MIN_CHARS = 120;
  const MIN_ASCII_RATIO = 0.6;
  // The 12 signals span ~3 distinct slop sub-genres (broetry-viral, corporate-AI
  // essay, listicle-bait); a post maxing one sub-genre fires only ~half the total
  // weight. The gain maps "fully one sub-genre" onto the redaction band. Tuned
  // against test/fixtures.js; this is the calibration knob, not the signals.
  const CALIBRATION_GAIN = 1.5;

  // --- shared pure helpers ---------------------------------------------------

  SS.fnv1a = function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };

  SS.mulberry32 = function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // DOM-shaped but DOM-independent: walks childNodes by numeric nodeType so it
  // runs against real nodes in Chrome and hand-built object trees in Node tests.
  // <br> and block-element boundaries become \n; our own UI nodes are skipped.
  // Replaces innerText, which degrades on virtualized/offscreen nodes and forces
  // synchronous layout.
  const BLOCK_TAGS = new Set([
    'P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'BLOCKQUOTE', 'PRE', 'TR', 'SECTION', 'ARTICLE',
  ]);

  // `skipSelector` (optional) prunes matching elements from the walk, e.g.
  // LinkedIn's "...more" expander button. Ignored on nodes without .matches
  // (the hand-built trees in Node tests).
  SS.serializeText = function serializeText(node, skipSelector) {
    let out = '';
    const walk = (n) => {
      if (!n) return;
      if (n.nodeType === 3) {
        out += n.nodeValue || '';
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = (n.tagName || '').toUpperCase();
      const cls = typeof n.className === 'string' ? n.className : '';
      // Skip our own injected UI; but never the root: when the overlay host IS
      // the text body, the body itself carries .slopshield-host, and bailing on
      // it would serialize every redacted post to '' on re-process.
      if (n !== node && cls.indexOf('slopshield-') !== -1) return;
      if (
        skipSelector &&
        n !== node &&
        typeof n.matches === 'function' &&
        n.matches(skipSelector)
      ) {
        return;
      }
      if (tag === 'BR') {
        out += '\n';
        return;
      }
      const isBlock = BLOCK_TAGS.has(tag);
      if (isBlock && out !== '' && !out.endsWith('\n')) out += '\n';
      const children = n.childNodes || [];
      for (let i = 0; i < children.length; i++) walk(children[i]);
      if (isBlock && out !== '' && !out.endsWith('\n')) out += '\n';
    };
    walk(node);
    return out;
  };

  // --- skip gates ------------------------------------------------------------

  SS.shouldSkip = function shouldSkip(text) {
    const t = String(text == null ? '' : text).trim();
    if (t.length < MIN_CHARS) return { skip: true, reason: 'too-short' };
    const allLetters = (t.match(/\p{L}/gu) || []).length;
    if (allLetters === 0) return { skip: true, reason: 'no-letters' };
    const ascii = (t.match(/[a-zA-Z]/g) || []).length;
    if (ascii / allLetters < MIN_ASCII_RATIO) return { skip: true, reason: 'non-english' };
    return { skip: false };
  };

  // --- precompute ------------------------------------------------------------

  function precompute(text) {
    const raw = String(text == null ? '' : text).trim().slice(0, MAX_ANALYZED_CHARS);
    // Apostrophe-normalized lowercase view; LinkedIn emits curly ’, every
    // phrase list and the contraction regex assume straight '.
    const lower = raw.toLowerCase().replace(/[’‘]/g, "'");
    const rawLines = raw.split(/\r?\n/);
    const nonEmpty = lower.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
    const sentences = lower
      .split(/(?<=[.!?…])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const words = lower.split(/\s+/).filter(Boolean);
    return { raw, lower, rawLines, nonEmpty, sentences, words, wordCount: words.length };
  }

  // --- scoring ---------------------------------------------------------------

  // Returns { total, breakdown, bonusApplied }.
  // breakdown rows: { key, name, weight, score, weighted } sorted by contribution.
  SS.scorePost = function scorePost(text) {
    const pre = precompute(text);
    const breakdown = SS.SIGNALS.map((sig) => {
      let score = 0;
      try {
        score = sig.fn(pre);
      } catch (e) {
        score = 0; // a broken signal must never take down the pipeline
      }
      return { key: sig.key, name: sig.name, weight: sig.weight, score, weighted: score * sig.weight };
    });
    let total = breakdown.reduce((a, r) => a + r.weighted, 0);
    const by = Object.fromEntries(breakdown.map((r) => [r.key, r.score]));
    const bonusApplied = by.broetry >= 0.7 && by.slopPhrases >= 0.6;
    if (bonusApplied) total *= 1.15; // the kill shot combination
    total = Math.min(100, Math.round(total * CALIBRATION_GAIN));
    breakdown.sort((a, b) => b.weighted - a.weighted);
    return { total, breakdown, bonusApplied };
  };

  // --- thresholds ------------------------------------------------------------

  // Higher sensitivity → lower threshold → meaner. Default 65 → redact at 67.5.
  SS.thresholds = function thresholds(sensitivity) {
    const s = Math.max(0, Math.min(100, Number(sensitivity) || 0));
    const redact = 75 - (s - 50) * 0.5;
    return { redact, sideEye: redact - 20 };
  };

  SS.tierFor = function tierFor(score, sensitivity) {
    const t = SS.thresholds(sensitivity);
    if (score >= t.redact) return 'redact';
    if (score >= t.sideEye) return 'sideeye';
    return 'human';
  };

  // Choose the verdict stamp for a post. Candidates = signal-specific lines for
  // the post's top-3 firing signals (so a stamp can only name a tell the post
  // actually has) PLUS the generic pool (so signature lines like CERTIFIED SLOP
  // stay in rotation). URN-seeded → stable across re-renders.
  // breakdown must be the sorted array from scorePost(). Returns {text, signal}.
  SS.pickVerdict = function pickVerdict(urn, tone, breakdown) {
    const pack = SS.VERDICTS[tone] || SS.VERDICTS.medium;
    const rand = SS.mulberry32(SS.fnv1a(String(urn)));
    const candidates = [];
    const fired = (breakdown || []).filter((r) => r.weighted > 0).slice(0, 3);
    for (const row of fired) {
      const pool = pack[row.key];
      if (pool) for (const line of pool) candidates.push({ text: line, signal: row.key });
    }
    for (const line of pack.generic) candidates.push({ text: line, signal: null });
    return candidates[Math.floor(rand() * candidates.length)];
  };

  // Plain-English names of the top firing signals; the "flagged for: …" line.
  SS.topReasons = function topReasons(breakdown, n) {
    return (breakdown || [])
      .filter((r) => r.weighted > 0)
      .slice(0, n || 2)
      .map((r) => r.name);
  };

  // A shareable severity grade for the score; punchier than a bare number on
  // the stamp ("TIER: WEAPONS-GRADE" travels further than "84/100").
  SS.tierLabel = function tierLabel(score) {
    if (score >= 90) return 'WEAPONS-GRADE';
    if (score >= 80) return 'INDUSTRIAL-GRADE';
    if (score >= 70) return 'CERTIFIED';
    if (score >= 60) return 'PROBABLE';
    return 'TRACE';
  };

  // Stable faux case number from the URN; turns each redaction into an
  // "evidence exhibit" and reads as intentional, not random.
  SS.caseNumber = function caseNumber(urn) {
    const h = SS.fnv1a(String(urn)).toString(36).toUpperCase();
    return 'LI-' + (h + '0000').slice(0, 4);
  };

  SS.DEFAULT_SETTINGS = {
    enabled: true,
    sensitivity: 65,
    tone: 'medium',
  };

  // The popup exposes three named modes instead of a raw slider; the tool is
  // "vibes with math on top", so a calibrated dial would be lying about its
  // precision. Each maps to a sensitivity the engine already understands:
  //   chill  → redact ≥ 80 (only egregious slop)
  //   default→ redact ≥ 67.5
  //   robot  → redact ≥ 50 (maximum paranoia)
  SS.PRESETS = [
    { key: 'chill', label: 'Chill', sensitivity: 40 },
    { key: 'default', label: 'Default', sensitivity: 65 },
    { key: 'robot', label: "Everyone's a Robot", sensitivity: 100 },
  ];

  // Map any stored sensitivity back to its nearest preset (for highlighting the
  // active mode, and for migrating users who had a custom slider value).
  SS.presetForSensitivity = function presetForSensitivity(n) {
    const v = Number(n);
    let best = SS.PRESETS[1];
    let bestDist = Infinity;
    for (const p of SS.PRESETS) {
      const d = Math.abs(p.sensitivity - v);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  };
})();
