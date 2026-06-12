// SlopShield — redactor.js
// Builds and tears down the three UI treatments: full censor-bar redaction,
// side-eye badge, and the optional human micro-badge. All DOM is built with
// createElement/textContent — no innerHTML anywhere near page content.
(() => {
  'use strict';
  const SS = (globalThis.SlopShield = globalThis.SlopShield || {});
  if (typeof document === 'undefined') return;

  const rngFor = (urn) => SS.mulberry32(SS.fnv1a(String(urn)));

  function verdictFor(urn, tone) {
    const pack = SS.VERDICTS[tone] || SS.VERDICTS.medium;
    return pack[Math.floor(rngFor(urn)() * pack.length) % pack.length];
  }

  const el = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // Remove every trace of SlopShield UI from one post container.
  function removeUI(container) {
    for (const n of container.querySelectorAll(
      '.slopshield-overlay, .slopshield-strip-bar, .slopshield-badge, .slopshield-panel'
    )) {
      n.remove();
    }
    for (const h of container.querySelectorAll('.slopshield-host')) {
      h.classList.remove('slopshield-host', 'slopshield-host-redacted');
    }
  }

  // Does the container already wear the right UI for this tier?
  function hasUI(container, tier, settings, state, urn) {
    if (tier === 'redact') {
      return state.revealed.has(urn)
        ? !!container.querySelector('.slopshield-strip-bar')
        : !!container.querySelector('.slopshield-overlay');
    }
    if (tier === 'sideeye') return !!container.querySelector('.slopshield-badge');
    return true; // 'human' tier wears no UI
  }

  // --- full redaction ---------------------------------------------------------

  function buildOverlay(container, info, settings, state) {
    const { urn, hostEl, score } = info;
    hostEl.classList.add('slopshield-host', 'slopshield-host-redacted');

    const overlay = el('div', 'slopshield-overlay');
    overlay.setAttribute('role', 'button');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('aria-label', 'Post redacted by SlopShield. Activate to reveal.');

    // Censor strips — URN-seeded geometry so re-renders look identical.
    const rng = rngFor(urn + ':strips');
    const stripCount = 3 + (rng() > 0.5 ? 1 : 0);
    for (let i = 0; i < stripCount; i++) {
      const strip = el('div', 'slopshield-strip');
      strip.style.top = `${8 + (82 / stripCount) * i + rng() * 8}%`;
      strip.style.left = `${3 + rng() * 9}%`;
      strip.style.width = `${38 + rng() * 48}%`;
      overlay.appendChild(strip);
    }

    const stamp = el('div', 'slopshield-stamp');
    stamp.appendChild(el('span', 'slopshield-verdict', verdictFor(urn, settings.tone)));
    stamp.appendChild(el('span', 'slopshield-meta', `SLOP SCORE: ${score}/100 · TAP TO REVEAL`));
    if (!state.animated.has(urn)) {
      stamp.classList.add('slopshield-slam');
      state.animated.add(urn);
    }
    overlay.appendChild(stamp);
    overlay.appendChild(el('div', 'slopshield-watermark', '🛡 SLOPSHIELD'));

    const onReveal = (e) => {
      e.preventDefault();
      e.stopPropagation();
      reveal(container, info, settings, state);
    };
    overlay.addEventListener('click', onReveal);
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') onReveal(e);
    });

    hostEl.appendChild(overlay);
  }

  function buildRevealedStrip(container, info, settings, state) {
    const { urn, hostEl, score } = info;
    hostEl.classList.add('slopshield-host');
    hostEl.classList.remove('slopshield-host-redacted');

    const bar = el('div', 'slopshield-strip-bar');
    bar.appendChild(el('span', 'slopshield-strip-label', `⚠️ revealed slop — score ${score}/100`));
    const btn = el('button', 'slopshield-rebutton', 're-redact');
    btn.type = 'button';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.revealed.delete(urn);
      removeUI(container);
      buildOverlay(container, info, settings, state);
    });
    bar.appendChild(btn);
    hostEl.prepend(bar);
  }

  function reveal(container, info, settings, state) {
    state.revealed.add(info.urn);
    const overlay = container.querySelector('.slopshield-overlay');
    if (!overlay) return;
    overlay.classList.add('slopshield-fading');
    setTimeout(() => {
      removeUI(container);
      buildRevealedStrip(container, info, settings, state);
    }, 150);
  }

  // --- side-eye badge ----------------------------------------------------------

  function buildBadge(container, info) {
    const { hostEl, score, breakdown } = info;
    hostEl.classList.add('slopshield-host');

    const badge = el('button', 'slopshield-badge', `🤨 ${score}/100 sus`);
    badge.type = 'button';
    badge.setAttribute('aria-label', `Slop score ${score} out of 100. Activate for breakdown.`);
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const existing = container.querySelector('.slopshield-panel');
      if (existing) {
        existing.remove();
        return;
      }
      const panel = el('div', 'slopshield-panel');
      panel.appendChild(el('div', 'slopshield-panel-title', 'top slop signals'));
      const top = (breakdown || []).filter((r) => r.weighted > 0).slice(0, 3);
      if (top.length === 0) panel.appendChild(el('div', 'slopshield-panel-row', 'nothing fired hard — borderline vibes'));
      for (const r of top) {
        const row = el('div', 'slopshield-panel-row');
        const name = el('div', 'slopshield-panel-name');
        name.appendChild(el('span', '', r.name));
        name.appendChild(el('span', '', `${Math.round(r.score * 100)}%`));
        row.appendChild(name);
        const bar = el('div', 'slopshield-panel-bar');
        const fill = el('div', 'slopshield-panel-fill');
        fill.style.width = `${Math.round(r.score * 100)}%`;
        bar.appendChild(fill);
        row.appendChild(bar);
        panel.appendChild(row);
      }
      hostEl.appendChild(panel);
    });
    hostEl.appendChild(badge);
  }

  // --- entry point --------------------------------------------------------------

  // Ensure `container` wears exactly the UI for `tier`. Cheap when nothing changed.
  function apply(container, info, tier, settings, state, force) {
    if (!force && hasUI(container, tier, settings, state, info.urn)) return;
    removeUI(container);
    if (tier === 'redact') {
      if (state.revealed.has(info.urn)) buildRevealedStrip(container, info, settings, state);
      else buildOverlay(container, info, settings, state);
    } else if (tier === 'sideeye') {
      buildBadge(container, info);
    }
    // 'human' tier: nothing to add — removeUI above already cleared any prior UI.
  }

  SS.redactor = { apply, removeUI, hasUI, verdictFor };
})();
