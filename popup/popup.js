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
const thresholdNoteEl = $('threshold-note');
const modeEl = $('mode');
const toneEl = $('tone');

// Signal key → plain-English name, for the "top crime" line.
const signalName = {};
for (const s of SS.SIGNALS) signalName[s.key] = s.name;

const RECEIPT_DEFAULTS = { session: 0, allTime: 0, sessionSignals: {}, sessionWorst: 0 };

function renderTone(tone) {
  for (const btn of toneEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.tone === tone);
  }
}

// Highlight the active mode (derived from the stored sensitivity) and describe
// what it does in one line.
function renderMode(sensitivity) {
  const active = SS.presetForSensitivity(sensitivity);
  for (const btn of modeEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.mode === active.key);
  }
  const t = SS.thresholds(active.sensitivity);
  thresholdNoteEl.textContent = `redacting at score ≥ ${t.redact} · side-eye at ≥ ${t.sideEye}`;
}

function topCrime(sessionSignals) {
  let best = null;
  let bestN = 0;
  for (const k in sessionSignals) {
    if (sessionSignals[k] > bestN) {
      bestN = sessionSignals[k];
      best = k;
    }
  }
  return best ? signalName[best] || best : null;
}

function renderReceipt(d) {
  $('receipt-count').textContent = d.session;
  $('receipt-alltime').textContent = d.allTime;
  $('receipt-crime').textContent = topCrime(d.sessionSignals) || '—';
  $('receipt-worst').textContent = d.sessionWorst
    ? `${d.sessionWorst}/100 · ${SS.tierLabel(d.sessionWorst)}`
    : '—';
}

// --- init ---------------------------------------------------------------------

storage.sync.get(DEFAULTS).then((settings) => {
  enabledEl.checked = settings.enabled;
  renderMode(settings.sensitivity);
  renderTone(settings.tone);
});

storage.local.get(RECEIPT_DEFAULTS).then(renderReceipt);

// Live report while the popup is open.
storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  storage.local.get(RECEIPT_DEFAULTS).then(renderReceipt);
});

// --- controls -----------------------------------------------------------------

enabledEl.addEventListener('change', () => {
  storage.sync.set({ enabled: enabledEl.checked });
});

modeEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  const preset = SS.PRESETS.find((p) => p.key === btn.dataset.mode);
  if (!preset) return;
  renderMode(preset.sensitivity);
  storage.sync.set({ sensitivity: preset.sensitivity });
});

toneEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tone]');
  if (!btn) return;
  renderTone(btn.dataset.tone);
  storage.sync.set({ tone: btn.dataset.tone });
});
