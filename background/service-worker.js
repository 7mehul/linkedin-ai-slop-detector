// SlopShield — service worker.
// One job: reset the per-session slop counter. Settings need no seeding —
// every storage read in the extension passes inline defaults.
// Both listeners matter: onStartup does NOT fire on install/enable/reload,
// and onInstalled does not fire on browser launch.
'use strict';

function resetSessionCounter() {
  chrome.storage.local.set({ session: 0 });
}

chrome.runtime.onStartup.addListener(resetSessionCounter);
chrome.runtime.onInstalled.addListener(resetSessionCounter);
