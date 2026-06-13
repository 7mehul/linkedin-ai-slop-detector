// SlopShield: signals.js
// Twelve pure signal functions. Each takes the shared `pre` (precomputed analysis,
// built once per post in scorer.js) and returns a score in [0, 1].
// No DOM, no chrome.*, no state; loadable in Node for tests.
(() => {
  'use strict';
  const SS = (globalThis.SlopShield = globalThis.SlopShield || {});
  const W = SS; // wordlists live on the same namespace

  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  // Linear ramp: 0 at `lo`, 1 at `hi` (works in either direction).
  const ramp = (x, lo, hi) => clamp01((x - lo) / (hi - lo));

  const countIncludes = (haystack, phrases) => {
    let n = 0;
    for (const p of phrases) {
      let i = haystack.indexOf(p);
      while (i !== -1) {
        n++;
        i = haystack.indexOf(p, i + p.length);
      }
    }
    return n;
  };

  const countWordHits = (haystack, words) => {
    let n = 0;
    for (const w of words) {
      const re = new RegExp(`\\b${w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
      const m = haystack.match(re);
      if (m) n += m.length;
    }
    return n;
  };

  // Contractions, curly-apostrophe-safe (pre.lower is apostrophe-normalized).
  // Deliberately excludes bare possessive 's; only real contraction forms count.
  const CONTRACTION_RE =
    /\b(?:(?:don|doesn|didn|can|won|wouldn|couldn|shouldn|isn|aren|wasn|weren|haven|hasn|ain)'t|(?:it|that|there|here|what|let)'s|i'(?:m|ve|ll|d)|(?:we|you|they)'(?:re|ve|ll|d)|(?:he|she|who)'(?:s|ll|d))\b/g;

  const EMOJI_BULLET_RE = /^\s*(?:[\p{Extended_Pictographic}]|[✅✔☑→➔•▪►])/u;

  SS.SIGNALS = [
    {
      key: 'broetry',
      name: 'broetry formatting',
      weight: 14,
      // One sentence per line, blank line between each; the LinkedIn signature.
      fn(pre) {
        const lines = pre.rawLines;
        const nonEmptyIdx = [];
        for (let i = 0; i < lines.length; i++) if (lines[i].trim() !== '') nonEmptyIdx.push(i);
        // Below 5 lines this is just a short post, not a structural choice.
        if (nonEmptyIdx.length < 5) return 0;
        let qualifying = 0;
        for (const i of nonEmptyIdx) {
          // A list marker ("1.", "2)") is cadence, not a sentence terminator.
          const line = lines[i].trim().replace(/^\d+[.)]\s*/, '');
          const sentenceCount = (line.match(/[.!?…]+(?=\s|$)/g) || []).length || 1;
          const followedByBlank = i === lines.length - 1 || lines[i + 1].trim() === '';
          if (sentenceCount === 1 && followedByBlank) qualifying++;
        }
        return ramp(qualifying / nonEmptyIdx.length, 0.3, 0.6);
      },
    },
    {
      key: 'slopPhrases',
      name: 'slop phrases',
      weight: 13,
      // Hooks + closers + generic filler; literal start/end hits count double.
      fn(pre) {
        let hits = countIncludes(pre.lower, W.HOOK_PHRASES);
        hits += countIncludes(pre.lower, W.GENERIC_PHRASES);
        hits += countIncludes(pre.lower, W.CLOSER_PHRASES);
        if (/\bafter \d+\+? years? (?:in|of|at)\b/.test(pre.lower)) hits++;
        const first = pre.nonEmpty[0] || '';
        const lastTwo = pre.nonEmpty.slice(-2).join('\n');
        if (W.HOOK_PHRASES.some((p) => first.includes(p))) hits++;
        if (W.CLOSER_PHRASES.some((p) => lastTwo.includes(p))) hits++;
        return clamp01(hits / 3);
      },
    },
    {
      key: 'burstiness',
      name: 'uniform sentence rhythm',
      weight: 10,
      // Humans vary sentence length; slop is metronomic. Inverse CV of sentence lengths.
      fn(pre) {
        const lens = pre.sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
        if (lens.length < 4) return 0;
        const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
        if (mean === 0) return 0;
        const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
        const cv = Math.sqrt(variance) / mean;
        return ramp(cv, 0.6, 0.3); // low variation → high score
      },
    },
    {
      key: 'emDash',
      name: 'em-dash abuse',
      weight: 8,
      fn(pre) {
        const dashes =
          (pre.raw.match(/[—–]/g) || []).length + (pre.raw.match(/\s(?:--|-)\s/g) || []).length;
        if (dashes < 2 || pre.wordCount === 0) return 0; // one honest dash is legal
        return clamp01(dashes / pre.wordCount / 0.025); // 2.5 per 100 words → 1.0
      },
    },
    {
      key: 'contrastHook',
      name: 'contrast-hook constructions',
      weight: 8,
      // "It's not X. It's Y." and friends.
      fn(pre) {
        const t = pre.lower;
        const patterns = [
          /it's not (?:about )?[^.!?\n]{1,80}[.!?…]\s*it's (?:about )?/,
          /isn't (?:about )?[^.!?\n]{1,80}[.!?…]\s*it's (?:about )?/,
          // Uncontracted corporate variant: "X is not about Y. It is about Z."
          /\bis not (?:about )?[^.!?\n]{1,80}[.!?…]\s*it is (?:about )?/,
          /\bthe (?:question|problem|issue|goal|point) isn't\b/,
          /\bstop \w+ing\b[^.!?\n]{0,60}[.!?…\n]+\s*start \w+ing\b/,
          /\bnot because [^.!?\n]{1,80} but because\b/,
          /\bdon't \w+[^.!?\n]{0,60}[.!?…\n]+\s*(?:instead|do this)/,
        ];
        let hits = 0;
        for (const re of patterns) if (re.test(t)) hits++;
        // Colon-newline contrast framing, the 2026 dialect's favourite:
        //   "Not:\n  X \n But:\n  Y"  and  "may not be:\n ... it may be:\n ..."
        if (/(^|\n)\s*not:\s*(\n|$)/.test(t) && /(^|\n)\s*but:\s*(\n|$)/.test(t)) hits++;
        if (/\bmay not be:?\s*\n/.test(t) && /\bit may be:?\s*\n/.test(t)) hits++;
        return clamp01(hits * 0.4);
      },
    },
    {
      key: 'aiVocab',
      name: 'delve-family vocabulary',
      weight: 8,
      fn(pre) {
        if (pre.wordCount === 0) return 0;
        const hits =
          countWordHits(pre.lower, W.AI_VOCAB) + countIncludes(pre.lower, W.AI_VOCAB_PHRASES);
        const per100 = (hits / pre.wordCount) * 100;
        return clamp01(per100 / 3);
      },
    },
    {
      key: 'contractions',
      name: 'contraction avoidance',
      weight: 7,
      // Formal "do not / it is" prose where a human would contract.
      fn(pre) {
        if (pre.wordCount < 30) return 0;
        const contracted = (pre.lower.match(CONTRACTION_RE) || []).length;
        const expanded = countIncludes(pre.lower, W.EXPANDED_FORMS);
        const opportunities = contracted + expanded;
        if (opportunities < 3) return 0;
        const ratio = contracted / opportunities;
        return ramp(ratio, 0.6, 0.2); // all-expanded → 1, mostly-contracted → 0
      },
    },
    {
      key: 'emojiBullets',
      name: 'emoji-bullet listicle',
      weight: 7,
      fn(pre) {
        let bulletLines = 0;
        let numberedLines = 0;
        for (const line of pre.nonEmpty) {
          if (EMOJI_BULLET_RE.test(line)) bulletLines++;
          if (/^\s*\d+[.)]\s/.test(line)) numberedLines++;
        }
        let score = bulletLines >= 3 ? 1 : bulletLines === 2 ? 0.6 : bulletLines === 1 ? 0.2 : 0;
        // Numbered listicle cadence ("1. ... 2. ... 3. ..."); slightly weaker tell.
        if (numberedLines >= 3) score = Math.max(score, 0.8);
        const listicle = new RegExp(`\\b\\d+ ${W.LISTICLE_NOUNS}\\b|\\bhere are \\d+\\b`);
        if (listicle.test(pre.lower)) score += 0.4;
        return clamp01(score);
      },
    },
    {
      key: 'baitCloser',
      name: 'engagement-bait closer',
      weight: 7,
      fn(pre) {
        // Closers cluster near the end, but a CTA + lettered poll can run the
        // last several lines, so widen the net beyond the final two.
        const tail = pre.nonEmpty.slice(-4).join('\n');
        const phraseHit = W.CLOSER_PHRASES.some((p) => tail.includes(p));
        const recycleHit = pre.raw.includes('♻');
        const arrowHit = /👇|⬇/u.test(pre.raw); // down-arrow "comment here" CTA
        // Lettered engagement poll: 3+ options like "A) ...", "(b) ...", "c. ...".
        let pollOpts = 0;
        for (const line of pre.nonEmpty) if (/^\s*\(?[a-f][).]\s/.test(line)) pollOpts++;
        const pollHit = pollOpts >= 3;
        let score = 0;
        if (phraseHit) score += 0.8;
        if (recycleHit) score += 0.6;
        if (arrowHit) score += 0.5;
        if (pollHit) score += 0.7;
        return clamp01(score);
      },
    },
    {
      key: 'epistemic',
      name: 'epistemic flatness',
      weight: 6,
      // Formulaic hedges score up; genuine-uncertainty markers subtract.
      fn(pre) {
        if (pre.wordCount < 30) return 0;
        const fake =
          countIncludes(pre.lower, W.FAKE_HEDGES) +
          countWordHits(pre.lower, W.FAKE_HEDGE_WORDS);
        let real =
          countWordHits(pre.lower, W.REAL_UNCERTAINTY) +
          countIncludes(pre.lower, W.REAL_UNCERTAINTY_PHRASES);
        // Standalone lowercase "i" in mixed-case text = a human typing fast.
        if (/[A-Z]/.test(pre.raw) && /(?:^|[\s,.!?(])i(?=[\s',.!?)])/.test(pre.raw)) real += 1;
        return clamp01(fake * 0.4 - real * 0.5);
      },
    },
    {
      key: 'ruleOfThree',
      name: 'rule-of-three constructions',
      weight: 6,
      fn(pre) {
        const t = pre.lower;
        let score = 0;
        if (/\bfirst\b[\s\S]{0,400}?\bsecond\b[\s\S]{0,400}?\bthird\b/.test(t)) score += 0.5;
        const triads = (t.match(/\b[\w'-]+, [\w'-]+,? and [\w'-]+\b/g) || []).length;
        if (triads >= 2) score += 0.5;
        else if (triads === 1) score += 0.25;
        // Three consecutive one-line statements opening with the same word.
        const firsts = pre.nonEmpty.map((l) => (l.split(/\s+/)[0] || '').toLowerCase());
        for (let i = 0; i + 2 < firsts.length; i++) {
          if (firsts[i] && firsts[i] === firsts[i + 1] && firsts[i] === firsts[i + 2]) {
            score += 0.4;
            break;
          }
        }
        return clamp01(score);
      },
    },
    {
      key: 'specificity',
      name: 'zero verifiable details',
      weight: 6,
      // Vague parables score up; concrete details (money, dates, odd numbers,
      // proper nouns) buy the post back down.
      fn(pre) {
        if (pre.wordCount < 30) return 0;
        const vague = countIncludes(pre.lower, W.VAGUE_ANECDOTE);
        let specifics = 0;
        specifics += (pre.raw.match(/\$\d[\d,.]*/g) || []).length;
        specifics += (pre.raw.match(/\b\d+(?:\.\d+)?%/g) || []).length;
        specifics += (pre.raw.match(/\b(?:19|20)\d\d\b/g) || []).length;
        const numbers = pre.raw.match(/\b\d+\b/g) || [];
        specifics += numbers.filter((n) => {
          const v = parseInt(n, 10);
          return v > 12 && v % 10 !== 0 && !(v >= 1900 && v <= 2099);
        }).length;
        // Mid-sentence capitalized words ≈ proper nouns; rough but cheap.
        const capWords = (pre.raw.match(/(?<![.!?…]\s|^|\n)\b[A-Z][a-z]{2,}/g) || []).length;
        if (capWords >= 3) specifics += 1;
        const base = specifics === 0 && pre.wordCount >= 80 ? 0.3 : 0;
        return clamp01(base + vague * 0.4 - specifics * 0.25);
      },
    },
  ];
})();
