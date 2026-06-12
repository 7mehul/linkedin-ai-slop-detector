// SlopShield — content.js
// Entry point: watches the feed, runs the pipeline (extract → score → redact),
// reacts live to settings changes, and keeps the slop counters.
// Observer strategy: watch document.body permanently with a callback that only
// queues nodes — all matching/scoring is deferred to idle slices so the hot
// path never blocks scroll. Immune to LinkedIn swapping the feed container.
(() => {
  'use strict';
  const SS = (globalThis.SlopShield = globalThis.SlopShield || {});
  if (typeof document === 'undefined') return;
  if (SS._contentStarted) return; // double-injection guard
  SS._contentStarted = true;

  const config = SS.config || {};
  const DEFAULTS = SS.DEFAULT_SETTINGS;

  let settings = Object.assign({}, DEFAULTS);
  let inert = false; // set when the extension context is invalidated (dev reload)

  const cache = new WeakMap(); // container → {urn, score, breakdown, appliedTier, skipped}
  const state = { revealed: new Set(), animated: new Set() }; // urn sets, session-only
  const counted = new Set(); // urns already counted toward the slop counter (this tab)
  let pendingDelta = 0;
  const pendingSignals = {}; // signalKey -> redactions not yet flushed (the "feed report")
  let pendingWorst = 0; // highest score not yet flushed
  let flushTimer = null;

  const hasChrome =
    typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.sync);

  // Every chrome.storage call goes through try/catch: after an extension reload,
  // orphaned content scripts throw "Extension context invalidated" — go inert.
  async function loadSettings() {
    if (!hasChrome) return;
    try {
      settings = await chrome.storage.sync.get(DEFAULTS);
    } catch (e) {
      inert = true;
    }
  }

  function scheduleCounterFlush() {
    if (flushTimer || !hasChrome) return;
    // Batched delta shrinks the read-modify-write race window across tabs;
    // a comedy counter does not need transactions.
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      const delta = pendingDelta;
      if (!delta || inert) return;
      pendingDelta = 0;
      const signalsDelta = Object.assign({}, pendingSignals);
      const worst = pendingWorst;
      for (const k in pendingSignals) delete pendingSignals[k];
      pendingWorst = 0;
      try {
        const cur = await chrome.storage.local.get({
          allTime: 0,
          session: 0,
          sessionSignals: {},
          sessionWorst: 0,
        });
        const mergedSignals = Object.assign({}, cur.sessionSignals);
        for (const k in signalsDelta) mergedSignals[k] = (mergedSignals[k] || 0) + signalsDelta[k];
        await chrome.storage.local.set({
          allTime: cur.allTime + delta,
          session: cur.session + delta,
          sessionSignals: mergedSignals,
          sessionWorst: Math.max(cur.sessionWorst, worst),
        });
      } catch (e) {
        inert = true;
      }
    }, 2000);
  }

  const pathnameAllowed = () =>
    !!config.forceRun || /^\/feed(\/|$)/.test(location.pathname) || /^\/in\//.test(location.pathname);

  // --- pipeline ---------------------------------------------------------------

  function processPost(container) {
    const ext = SS.extractor.extract(container);
    if (!ext) {
      // A re-render may have removed the text body — don't leave stale UI.
      SS.redactor.removeUI(container);
      container.setAttribute('data-slopshield', 'skipped');
      return;
    }
    const skip = SS.shouldSkip(ext.text);
    if (skip.skip) {
      SS.redactor.removeUI(container); // a re-render may have shrunk a scored post
      container.setAttribute('data-slopshield', 'skipped');
      cache.set(container, { urn: ext.urn, skipped: true, appliedTier: 'none' });
      return;
    }

    // Cache hit requires the SAME urn — LinkedIn recycles nodes for new posts,
    // and a recycled node with a stale score is worse than no cache at all.
    let entry = cache.get(container);
    if (!entry || entry.urn !== ext.urn || entry.skipped) {
      const r = SS.scorePost(ext.text);
      entry = { urn: ext.urn, score: r.total, breakdown: r.breakdown, appliedTier: null };
      cache.set(container, entry);
    }

    const tier = SS.tierFor(entry.score, settings.sensitivity);
    const info = {
      urn: ext.urn,
      bodyEl: ext.bodyEl,
      hostEl: ext.hostEl,
      score: entry.score,
      breakdown: entry.breakdown,
    };
    SS.redactor.apply(container, info, tier, settings, state, entry.appliedTier !== tier);
    entry.appliedTier = tier;
    container.setAttribute('data-slopshield', 'done');

    if (tier === 'redact' && !counted.has(ext.urn)) {
      counted.add(ext.urn);
      pendingDelta++;
      const top = entry.breakdown.find((r) => r.weighted > 0);
      if (top) pendingSignals[top.key] = (pendingSignals[top.key] || 0) + 1;
      if (entry.score > pendingWorst) pendingWorst = entry.score;
      scheduleCounterFlush();
    }
  }

  // --- batching ----------------------------------------------------------------

  const pendingRoots = new Set();
  const pendingPosts = new Set();
  let scheduled = false;

  const ric =
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb) => setTimeout(cb, 200);

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    // timeout matters: during continuous scroll there IS no idle time and a
    // bare requestIdleCallback would starve.
    ric(processBatch, { timeout: 400 });
  }

  function processBatch() {
    scheduled = false;
    if (inert) {
      pendingRoots.clear();
      pendingPosts.clear();
      return;
    }
    if (!settings.enabled || !pathnameAllowed()) {
      pendingRoots.clear();
      pendingPosts.clear();
      return;
    }
    for (const root of pendingRoots) {
      pendingRoots.delete(root);
      if (!root.isConnected) continue;
      for (const post of SS.extractor.findPosts(root)) pendingPosts.add(post);
    }
    let n = 0;
    for (const post of pendingPosts) {
      pendingPosts.delete(post);
      if (!post.isConnected) continue;
      processPost(post);
      if (++n >= 10) break; // never block a frame on a big batch
    }
    if (pendingRoots.size || pendingPosts.size) schedule();
  }

  // Re-evaluate everything currently in the DOM (settings changed, toggle, etc.).
  // WeakMaps aren't iterable — walk the DOM and look nodes up instead.
  function applyAll(forceRebuild) {
    if (!settings.enabled) {
      for (const c of document.querySelectorAll('[data-slopshield]')) SS.redactor.removeUI(c);
      return;
    }
    for (const post of SS.extractor.findPosts(document.body)) {
      if (forceRebuild) {
        const entry = cache.get(post);
        if (entry) entry.appliedTier = null; // forces re-render with fresh verdict/tier
      }
      pendingPosts.add(post);
    }
    schedule();
  }

  // --- wiring -------------------------------------------------------------------

  if (hasChrome) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync' || inert) return;
        let any = false;
        let rebuild = false;
        for (const key of Object.keys(changes)) {
          if (key in settings) {
            settings[key] = changes[key].newValue;
            any = true;
            // Tone changes the stamp text on posts whose tier doesn't change —
            // that needs a forced re-render, not just a re-threshold.
            if (key === 'tone') rebuild = true;
          }
        }
        if (any) applyAll(rebuild);
      });
    } catch (e) {
      inert = true;
    }
  }

  (async function init() {
    await loadSettings();

    pendingRoots.add(document.body); // initial sweep: posts predate any mutation
    schedule();

    const isOurs = (node) => {
      const cls = node.nodeType === 1 && typeof node.className === 'string' ? node.className : '';
      return cls.indexOf('slopshield-') !== -1;
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // A mutation that adds/removes our own UI is self-inflicted churn — skip it,
        // otherwise injecting an overlay would re-trigger processing of its own post.
        let ours = false;
        for (const node of m.addedNodes) {
          if (isOurs(node)) {
            ours = true;
            continue;
          }
          if (node.nodeType === 1) pendingRoots.add(node); // a whole new post subtree
        }
        for (const node of m.removedNodes) if (isOurs(node)) ours = true;
        if (ours) continue;
        // The mutation target locates the owning post even when LinkedIn recycles a
        // container in place (swaps inner content, including text-only changes) — so
        // the post gets reprocessed and the URN-staleness check runs.
        const tgt = m.target;
        if (tgt && tgt.nodeType === 1 && tgt.closest) {
          const host = tgt.closest(SS.SELECTORS.POST_CONTAINER);
          if (host) pendingRoots.add(host);
        }
      }
      if (pendingRoots.size) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Selector-rot canary: one friendly warning, never a retry loop.
    setTimeout(() => {
      if (!pathnameAllowed() || !/^\/feed(\/|$)/.test(location.pathname)) return;
      if (SS.extractor.findPosts(document.body).length === 0) {
        console.warn(
          'SlopShield: LinkedIn changed their DOM again — selectors in content/wordlists.js need updating. ' +
            'Run SlopShield.extractor.debugScan() in this console to investigate.'
        );
      }
    }, 5000);
  })();
})();
