# SlopShield Privacy Policy

Last updated: June 12, 2026

## The short version

SlopShield collects nothing. Nothing leaves your browser. There is no server, no
account, no analytics, no telemetry, and no network request of any kind.

## What SlopShield does

SlopShield is a Chrome extension that runs entirely on your device. When you view
your LinkedIn feed, it reads the text of posts already rendered on your screen,
scores that text against a list of writing-style heuristics, and visually covers
posts that score above a threshold. All of this happens locally, inside your
browser tab.

## Data collection

SlopShield does not collect, transmit, sell, or share any data. Specifically:

- It makes zero network requests. There is no backend to send anything to.
- It does not read or store your LinkedIn credentials, messages, profile,
  connections, or any personal information.
- Post text is scored in memory and immediately discarded. It is never stored.
- It contains no analytics, tracking pixels, fingerprinting, or third-party code.

## What is stored, and where

SlopShield stores a small amount of data using Chrome's built-in extension
storage, on your device only:

- Your settings: on/off, mode, and verdict tone (chrome.storage.sync, so your
  own Chrome profile can carry them across your devices via your Google account,
  exactly like any extension setting).
- Counters: how many posts have been redacted (a number), which detection
  signals fired most (signal names and counts), and the highest score seen this
  session (a number). These live in chrome.storage.local on your device.

No post content, author names, URLs, or any other feed data is ever stored.

## Permissions

SlopShield requests one permission, "storage", to save the settings and counters
described above. Its content script runs only on linkedin.com pages, because
restyling the LinkedIn feed is the extension's only function.

## Changes

If this policy ever changes, the change will be visible in this file's public
edit history in the repository.

## Contact

Questions: open an issue at
https://github.com/7mehul/linkedin-ai-slop-detector/issues
