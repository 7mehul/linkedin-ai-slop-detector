# 🛡 SlopShield

**A Chrome extension that scans your LinkedIn feed, scores every post against a
battery of "AI-slop dialect" heuristics, and slams a censor-bar redaction over the
offenders, complete with a snarky verdict stamp.**

> CERTIFIED SLOP · SLOP SCORE 84/100 · TIER: INDUSTRIAL-GRADE

*(screenshots live in [store/screenshots](store/screenshots))*

## What this is (and isn't)

This is a comedy project. **SlopShield does not detect AI.** It detects the
*LinkedIn-slop dialect*: a writing style that correlates heavily with AI-assisted
posting but also catches humans who write like that on purpose. It will absolutely
flag sincere people who type "I'm thrilled to announce" with their own ten fingers.
**That's the bit. False positives are a feature.**

One rule is load-bearing: SlopShield roasts the *writing*, never the *writer*. Every
verdict judges the post ("BROETRY VIOLATION"), not the person. Scores are vibes
with math on top. Do not use SlopShield output to accuse actual humans of anything.

And yes: this README, the extension UI, and every document in this repository
contain zero em dashes. There is a test that enforces it. The only em dashes in the
codebase are the ones we hunt (the detection regex and the test fixtures).

## Install

**Chrome Web Store:** submission in progress. Until it's live, load it unpacked:

1. `git clone https://github.com/7mehul/linkedin-ai-slop-detector.git`
2. Open `chrome://extensions`
3. Toggle **Developer mode** (top right)
4. **Load unpacked** and select the cloned folder
5. Open (or reload) [linkedin.com/feed](https://www.linkedin.com/feed/) and scroll

No build step. No dependencies. If you reload the extension while LinkedIn tabs are
open, reload those tabs too; Chrome doesn't re-inject content scripts into pages
that were already open.

## How it works

Everything runs locally in the content script. **Zero network calls, zero analytics,
zero data collection. Nothing leaves your browser.** See [PRIVACY.md](PRIVACY.md).

Each post is scored 0 to 100 by 12 weighted signals:

| Signal | Weight | What it catches |
|---|---|---|
| Broetry formatting | 14 | One sentence per line, blank line between each |
| Slop phrases | 13 | "I'm thrilled to announce", "Let that sink in", "game-changer" |
| Uniform sentence rhythm | 10 | Low burstiness; humans vary sentence length, slop doesn't |
| Em-dash abuse | 8 | The signature punctuation, you know the one, everywhere |
| Contrast-hook constructions | 8 | "It's not X. It's Y.", "Stop doing X. Start doing Y." |
| Delve-family vocabulary | 8 | delve, tapestry, leverage, seamless, transformative |
| Contraction avoidance | 7 | "do not / it is" where a human would contract |
| Emoji-bullet listicle | 7 | 🚀 ✅ 💡 bullets, "Here are 7 truths" |
| Engagement-bait closer | 7 | "Agree?", "Thoughts?", "Repost if ♻️" |
| Epistemic flatness | 6 | Formulaic hedges; genuine "idk / tbh" subtracts |
| Rule-of-three constructions | 6 | "First... Second... Third...", triadic lists |
| Zero verifiable details | 6 | Vague parables ("a mentor once told me") with no specifics |

Posts that max both broetry *and* slop phrases get a 1.15x kill-shot bonus. The
**mode** (Chill / Default / Everyone's a Robot) moves the redaction threshold
(default is deliberately aggressive); mid-scorers get a 🤨 side-eye badge with a
signal breakdown instead of the full censor bar. Skipped entirely: posts under 120
characters, non-English posts, and pure reposts with no commentary (only the
*reposter's* words are ever scored).

Verdict stamps are diagnostic: a signal-specific verdict like "EM-DASH CRIME SCENE"
can only appear when that signal actually fired in the post, and every stamp
carries a "flagged for" line naming the top reasons. Verdicts are seeded per post,
so the same post always wears the same stamp.

## The science (sort of)

The signals are grounded in real published findings; the *threshold calibration* is
deliberately unhinged:

- Kobak, D., Gonzalez-Marquez, R., Horvat, E.-A., Lause, J.
  *Delving into LLM-assisted writing in biomedical publications through excess
  vocabulary.* Science Advances 11, eadt3813 (2025). The post-ChatGPT explosion of
  "delve", "intricate", "commendable" et al.
- Liang, W. et al. *Monitoring AI-Modified Content at Scale: A Case Study on the
  Impact of ChatGPT on AI Conference Peer Reviews.* ICML 2024. Same vocabulary
  effect, measured in the wild.
- Jakesch, M., Hancock, J. T., Naaman, M. *Human heuristics for AI-generated
  language are flawed.* PNAS 120(11), e2208839120 (2023). Formality and
  contraction avoidance as (mis)judged AI tells.
- GPTZero's burstiness work: humans vary sentence length; generated text is
  metronomic.

## Settings

Click the toolbar icon:

- **Master toggle**: instant on/off, no reload
- **Mode**: Chill / Default / Everyone's a Robot. Moves the redaction threshold live.
  Chill redacts only the most egregious slop; Everyone's a Robot is maximum paranoia.
- **Verdict tone**: Mild / Medium / Unhinged
- **Feed report**: a screenshottable session receipt with posts redacted, your
  feed's top crime, the worst offender's score and tier, and the all-time count

## Development

```bash
npm test            # calibration table + assertions over test/fixtures.js
npm run icons       # regenerate icons/ (zero-dep PNG writer)
npm run package     # build the store-ready zip into dist/
npm run shots       # regenerate store screenshots (needs Chrome installed)
```

Open `test/harness.html` from any static server for a mock feed with the real
pipeline running; no LinkedIn login needed. Add `?clean` to hide the dev controls.

LinkedIn's DOM rots. Every selector lives in one block (`SS.SELECTORS` in
[content/wordlists.js](content/wordlists.js)); when the feed changes, fix it there
and nowhere else. `SlopShield.extractor.debugScan()` in the DevTools console prints
what the extractor currently sees.

## Disclaimer

Scores are vibes with math on top. Do not use SlopShield output to accuse actual
humans of anything. Roast posts, not people.

SlopShield is an independent project. It is not affiliated with, endorsed by, or
sponsored by LinkedIn Corporation.

MIT, see [LICENSE](LICENSE).
