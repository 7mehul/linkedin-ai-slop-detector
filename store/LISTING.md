# Chrome Web Store submission kit

Everything to paste into the Developer Dashboard, field by field. The zip to
upload is built with `npm run package` and lands in `dist/`.

---

## Store listing tab

**Name** (from manifest): SlopShield

**Summary** (113/132 chars, paste into the Summary field):
Censors the AI slop in your LinkedIn feed behind a black bar with a snarky verdict. Runs entirely in your browser.

**Detailed description** (paste as plain text):

```
Your LinkedIn feed is 90% slop. SlopShield does something about it.

Every "I'm thrilled to announce", every broetry humble-brag, every ✅ emoji
listicle that ends in "Agree? 👇" gets exactly what it deserves: a black censor
bar, a snarky verdict stamp, and a slop score out of 100.

HOW IT WORKS

As you scroll, SlopShield reads each post and scores it against 12 heuristics
for the "LinkedIn-slop dialect": broetry line breaks, em-dash overload,
delve-grade vocabulary, engagement-bait polls, contrast-hook framing, and more.
High scorers get redacted behind a classified-document censor bar, stamped with
the verdict ("CERTIFIED SLOP", "BROETRY VIOLATION", "EM-DASH CRIME SCENE") and
the exact reasons it got flagged. Tap to reveal the post underneath. Tap again
to re-redact.

YOU'RE IN CONTROL

- Three modes: Chill, Default, and Everyone's a Robot
- Three verdict tones: Mild, Medium, Unhinged
- A Feed Report that tallies how much slop you've survived this session

THE HONEST PART

SlopShield does not detect AI. Nothing reliably can. It detects a writing style
that correlates heavily with AI-assisted posting, and yes, it will occasionally
flag a sincere human who happens to write like a press release. That's the bit.
It judges the writing, never the writer.

PRIVACY

Everything runs locally in your browser. Zero network calls. No analytics. No
accounts. No data collection of any kind. There is literally no server for your
data to go to. Fully open source.

Roast posts, not people.

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
