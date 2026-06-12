// SlopShield popup. Talks to the content scripts exclusively through
// chrome.storage — no tab messaging, no extra permissions.
'use strict';

const SS = globalThis.SlopShield; // scorer.js loaded first: DEFAULT_SETTINGS, thresholds
const DEFAULTS = SS.DEFAULT_SETTINGS;

// In the real popup chrome.storage always exists; the in-memory fallback makes
// the page openable from a static server for styling work (same dev flow as
// test/harness.html).
const storage =
  typeof chrome !== 'undefined' && chrome.storage
    ? chrome.storage
    : (() => {
        const stores = { sync: {}, local: {} };
        const area = (n) => ({
          get: (d) => Promise.resolve(Object.assign({}, d, stores[n])),
          set: (o) => {
            Object.assign(stores[n], o);
            return Promise.resolve();
          },
        });
        return { sync: area('sync'), local: area('local'), onChanged: { addListener() {} } };
      })();

const $ = (id) => document.getElementById(id);
const enabledEl = $('enabled');
const sensEl = $('sensitivity');
const sensValueEl = $('sensitivity-value');
const thresholdNoteEl = $('threshold-note');
const toneEl = $('tone');
const humanEl = $('humanBadge');
const counterEl = $('counter-line');

function renderTone(tone) {
  for (const btn of toneEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.tone === tone);
  }
}

function renderThresholdNote(sensitivity) {
  const t = SS.thresholds(sensitivity);
  thresholdNoteEl.textContent =
    t.redact >= 100
      ? 'redacting only perfect 100s — basically off'
      : `redacting at score ≥ ${t.redact} · side-eye at ≥ ${t.sideEye}`;
}

function renderCounter({ session, allTime }) {
  counterEl.textContent = `🛡 ${session} posts redacted this session · ${allTime} all time`;
}

// --- init ---------------------------------------------------------------------

storage.sync.get(DEFAULTS).then((settings) => {
  enabledEl.checked = settings.enabled;
  humanEl.checked = settings.humanBadge;
  sensEl.value = settings.sensitivity;
  sensValueEl.textContent = settings.sensitivity;
  renderThresholdNote(settings.sensitivity);
  renderTone(settings.tone);
});

storage.local.get({ session: 0, allTime: 0 }).then(renderCounter);

// Live counter while the popup is open.
storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  storage.local.get({ session: 0, allTime: 0 }).then(renderCounter);
});

// --- controls -----------------------------------------------------------------

enabledEl.addEventListener('change', () => {
  storage.sync.set({ enabled: enabledEl.checked });
});

humanEl.addEventListener('change', () => {
  storage.sync.set({ humanBadge: humanEl.checked });
});

// Debounced: storage.sync allows ~120 writes/min, a slider drag emits hundreds.
let sensTimer = null;
sensEl.addEventListener('input', () => {
  const v = Number(sensEl.value);
  sensValueEl.textContent = v;
  renderThresholdNote(v);
  clearTimeout(sensTimer);
  sensTimer = setTimeout(() => storage.sync.set({ sensitivity: v }), 250);
});

toneEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tone]');
  if (!btn) return;
  renderTone(btn.dataset.tone);
  storage.sync.set({ tone: btn.dataset.tone });
});
