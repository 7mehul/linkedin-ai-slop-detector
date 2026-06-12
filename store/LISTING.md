# Chrome Web Store submission kit

Everything to paste into the Developer Dashboard, field by field. The zip to
upload is built with `npm run package` and lands in `dist/`.

---

## Store listing tab

**Name** (from manifest): SlopShield

**Summary** (from manifest description, 121/132 chars):
Redacts LinkedIn slop with a censor bar and a snarky stamp. Detects the dialect, not the AI. Nothing leaves your browser.

**Detailed description** (paste as plain text):

```
SlopShield scans your LinkedIn feed and slams a censor-bar redaction over posts
written in the "AI-slop dialect", complete with a snarky verdict stamp, a slop
score out of 100, and the exact reasons the post was flagged.

THE HONEST PITCH

SlopShield does not detect AI. Nothing can, reliably. It detects a writing
style: broetry line breaks, "I'm thrilled to announce", em-dash overload,
delve-grade vocabulary, emoji bullet listicles, and "Agree?" engagement bait.
That style correlates heavily with AI-assisted posting, and it also catches
sincere humans who write like that on purpose. That's the bit. False positives
are a feature, not a bug.

WHAT IT DOES

- Scores every post in your feed from 0 to 100 using 12 local heuristics
- Redacts high scorers behind a classified-document censor bar with a verdict
  stamp ("CERTIFIED SLOP", "BROETRY VIOLATION", "THOUGHT LEADERSHIP(TM)
  DETECTED") and a case number
- Every stamp explains itself: "flagged for: broetry formatting, slop phrases"
- Tap any redaction to reveal the post; re-redact it just as easily
- Mid-scorers get a side-eye badge with a full signal breakdown instead
- Three modes: Chill, Default, and Everyone's a Robot
- Three verdict tones: Mild, Medium, Unhinged
- A Feed Report in the popup: posts redacted this session, your feed's top
  crime, and the worst offender's score

PRIVACY, FOR REAL

Everything runs locally inside your browser tab. SlopShield makes zero network
requests. No analytics, no telemetry, no accounts, no data collection of any
kind. Post text is scored in memory and discarded. The only thing stored is
your settings and a redaction counter, in Chrome's local extension storage.
The code is open source.

THE FINE PRINT

Scores are vibes with math on top. Roast posts, not people. SlopShield judges
writing style, never authors, and should not be used to accuse anyone of
anything. It will flag earnest humans. It may flag you.

SlopShield is an independent project. It is not affiliated with, endorsed by,
or sponsored by LinkedIn Corporation.
```

**Category:** Social & Communication
**Language:** English

**Graphic assets:**
- Store icon 128x128: `icons/icon128.png`
- Screenshots 1280x800: `store/screenshots/01-redacted-feed.png`,
  `02-side-eye-badge.png`, `03-popup-report.png`
- Promo tiles: optional, skip for v1

**Additional fields:**
- Official URL / homepage: https://github.com/7mehul/linkedin-ai-slop-detector
- Support URL: https://github.com/7mehul/linkedin-ai-slop-detector/issues

---

## Privacy practices tab

**Single purpose description:**
```
SlopShield visually redacts posts in the user's own LinkedIn feed when their
writing style matches a set of locally evaluated heuristics. All scoring and
redaction happens on the user's device.
```

**Permission justification: storage**
```
Stores the user's settings (on/off, mode, verdict tone) and local redaction
counters (numbers and signal names only). No browsing data or page content is
ever stored.
```

**Host permission justification: www.linkedin.com (content script match)**
```
The extension's only function is to restyle posts in the user's own LinkedIn
feed. The content script reads the text of visible posts to score them locally
and overlays a redaction on high scorers. It makes no network requests, stores
no page content, and performs no actions on the user's behalf.
```

**Remote code:** No, this item does not use remote code.

**Data usage:** check "This item does not collect or use any user data" and
certify compliance with the Developer Program Policies. Every box in the data
collection table stays unchecked: we collect nothing.

**Privacy policy URL:**
https://github.com/7mehul/linkedin-ai-slop-detector/blob/main/PRIVACY.md

---

## Distribution tab

- Visibility: Public
- Regions: all regions
- Pricing: free

---

## Submission walkthrough (the parts only a human can do)

1. Go to https://chrome.google.com/webstore/devconsole and sign in with the
   Google account that should own the listing.
2. Pay the one-time 5 USD developer registration fee and verify the contact
   email Google sends.
3. New item, then upload `dist/slopshield-1.0.0.zip`.
4. Paste the Store listing fields above; upload the three screenshots.
5. Fill the Privacy practices tab with the texts above; set the privacy policy
   URL.
6. Set Distribution to public and free.
7. Submit for review.

Review usually takes anywhere from a few hours to a few business days. First
submissions and extensions that modify a third-party site sometimes take the
longer end of that range. You'll get an email either way; rejections name the
specific policy, and resubmission after a fix is normal and fast.

After approval, the store URL is permanent. Future updates: bump "version" in
manifest.json, `npm run package`, upload the new zip, submit. Users update
automatically.

---

## Branding cautions

- Never use the LinkedIn logo or LinkedIn-blue branding in store assets.
- "LinkedIn" appears in copy only to describe compatibility ("for LinkedIn"),
  which is standard nominative use.
- The non-affiliation disclaimer stays in the detailed description.
