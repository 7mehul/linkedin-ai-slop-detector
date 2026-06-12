// SlopShield: extractor.js
// Pulls post text out of LinkedIn's DOM. Everything selector-shaped lives in
// SS.SELECTORS (wordlists.js) so DOM drift is a one-block fix.
(() => {
  'use strict';
  const SS = (globalThis.SlopShield = globalThis.SlopShield || {});
  if (typeof document === 'undefined') return; // engine-only environments (Node tests)

  const SEL = SS.SELECTORS;

  // All post containers in/under `root`, outermost only (a quoted repost can
  // itself match the container selector; the outer post owns it).
  function findPosts(root) {
    const node = root && root.nodeType === 1 ? root : null;
    if (!node) return [];
    const out = [];
    if (node.matches && node.matches(SEL.POST_CONTAINER)) out.push(node);
    if (node.querySelectorAll) out.push(...node.querySelectorAll(SEL.POST_CONTAINER));
    return out.filter((el, _, arr) => !arr.some((other) => other !== el && other.contains(el)));
  }

  // Post identity, oldest hooks first: classic data-urn/data-id attributes, then
  // the new stack's stable componentkey on the commentary element. The caller
  // falls back to a text hash when neither exists.
  function getUrn(container, bodyEl) {
    const attr = container.getAttribute('data-urn') || container.getAttribute('data-id');
    if (attr) return attr;
    const keyed =
      (bodyEl && bodyEl.closest(SEL.COMMENTARY_KEY)) ||
      container.querySelector(SEL.COMMENTARY_KEY);
    if (keyed) return 'ck:' + keyed.getAttribute('componentkey');
    return null;
  }

  // First text body that belongs to the OUTER poster; candidates inside a
  // quoted/reposted sub-update are the quoted author's words, not theirs.
  // TEXT_BODY selectors are tried in preference order (most specific first).
  function getTextBody(container) {
    for (const sel of SEL.TEXT_BODY.split(',')) {
      for (const cand of container.querySelectorAll(sel.trim())) {
        const quoted = cand.closest(SEL.QUOTED_UPDATE);
        if (quoted && container.contains(quoted)) continue;
        return cand;
      }
    }
    return null;
  }

  // The overlay host must sit ABOVE LinkedIn's "…see more" clamp wrapper
  // (max-height + overflow:hidden) or the stamp gets clipped to ~3 text lines.
  function getHost(bodyEl, container) {
    const clamp = bodyEl.closest(SEL.CLAMP_WRAPPER);
    if (clamp && container.contains(clamp) && clamp.parentElement && clamp.parentElement !== container) {
      return clamp.parentElement;
    }
    return clamp || bodyEl;
  }

  function extract(container) {
    const bodyEl = getTextBody(container);
    if (!bodyEl) return null;
    const text = SS.serializeText(bodyEl, SEL.EXPAND_BUTTON)
      .replace(/\s*(?:…|\.\.\.)?\s*see more\s*$/i, '')
      .replace(/(?:…|\.\.\.)\s*more\s*$/i, '')
      .trim();
    if (!text) return null; // pure repost with no outer commentary
    const urn = getUrn(container, bodyEl) || 'txt:' + SS.fnv1a(text.slice(0, 80));
    return { urn, bodyEl, hostEl: getHost(bodyEl, container), text };
  }

  // Console helper for re-deriving selectors when LinkedIn ships a redesign:
  // SlopShield.extractor.debugScan() from DevTools on a /feed page.
  function debugScan() {
    const rows = findPosts(document.body).map((el) => {
      const ext = extract(el);
      if (!ext) return { urn: getUrn(el) || '(none)', status: 'no-text-body', preview: '' };
      const skip = SS.shouldSkip(ext.text);
      const score = skip.skip ? '-' : SS.scorePost(ext.text).total;
      return {
        urn: ext.urn.slice(0, 40),
        status: skip.skip ? `skipped:${skip.reason}` : 'scored',
        score,
        preview: ext.text.slice(0, 60).replace(/\n/g, ' '),
      };
    });
    console.table(rows);
    return rows.length;
  }

  SS.extractor = { findPosts, getUrn, getTextBody, getHost, extract, debugScan };
})();
