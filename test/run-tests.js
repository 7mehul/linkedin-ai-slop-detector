// SlopShield test runner: `npm test`.
// Prints a calibration table for every fixture, then runs hard assertions.
// Zero dependencies; loads the engine exactly the way Chrome does (classic
// scripts attaching to globalThis.SlopShield), minus the DOM-touching files.
'use strict';

const path = require('path');

// Engine load order mirrors manifest.json (DOM files excluded; they need a document).
require(path.join(__dirname, '..', 'content', 'wordlists.js'));
require(path.join(__dirname, '..', 'content', 'signals.js'));
require(path.join(__dirname, '..', 'content', 'scorer.js'));

const SS = globalThis.SlopShield;
const { FIXTURES } = require('./fixtures.js');

const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

// --- calibration table -------------------------------------------------------

const rows = FIXTURES.map((f) => {
  const skip = SS.shouldSkip(f.text);
  const result = SS.scorePost(f.text);
  const top3 = result.breakdown
    .filter((r) => r.weighted > 0)
    .slice(0, 3)
    .map((r) => `${r.key}:${r.weighted.toFixed(1)}`)
    .join('  ');
  return { fixture: f, skip, result, top3 };
});

console.log('\n  SLOPSHIELD CALIBRATION TABLE');
console.log('  ' + '─'.repeat(96));
console.log(
  `  ${'fixture'.padEnd(34)}${'expect'.padEnd(12)}${'score'.padEnd(7)}${'bonus'.padEnd(7)}top signals`
);
console.log('  ' + '─'.repeat(96));
for (const { fixture, result } of rows) {
  console.log(
    `  ${fixture.name.padEnd(34)}${fixture.expect.padEnd(12)}${String(result.total).padEnd(7)}${(result.bonusApplied ? 'x1.15' : '-').padEnd(7)}${rows.find((r) => r.fixture === fixture).top3}`
  );
}
console.log('  ' + '─'.repeat(96));
{
  const t = SS.thresholds(SS.DEFAULT_SETTINGS.sensitivity);
  console.log(
    `  default sensitivity ${SS.DEFAULT_SETTINGS.sensitivity}: redact ≥ ${t.redact}, side-eye ≥ ${t.sideEye}\n`
  );
}

// --- assertions: fixture bands ------------------------------------------------

for (const { fixture, skip, result } of rows) {
  assert(!skip.skip, `${fixture.name}: must not trip the skip gate (got ${skip.reason})`);
  if (fixture.expect === 'slop') {
    assert(result.total >= 70, `${fixture.name}: slop must score ≥ 70, got ${result.total}`);
  } else if (fixture.expect === 'human') {
    assert(result.total <= 35, `${fixture.name}: human must score ≤ 35, got ${result.total}`);
  }
  // Borderlines are printed for eyeballing, not asserted; that is the bit.
}

// --- assertions: engine invariants ---------------------------------------------

const weightSum = SS.SIGNALS.reduce((a, s) => a + s.weight, 0);
assert(weightSum === 100, `signal weights must sum to 100, got ${weightSum}`);

for (const [sens, redact, sideEye] of [
  [0, 100, 80],
  [50, 75, 55],
  [65, 67.5, 47.5],
  [100, 50, 30],
]) {
  const t = SS.thresholds(sens);
  assert(
    t.redact === redact && t.sideEye === sideEye,
    `thresholds(${sens}) must be {${redact}, ${sideEye}}, got {${t.redact}, ${t.sideEye}}`
  );
}
assert(SS.tierFor(70, 65) === 'redact', 'tierFor(70, 65) must redact');
assert(SS.tierFor(50, 65) === 'sideeye', 'tierFor(50, 65) must side-eye');
assert(SS.tierFor(20, 65) === 'human', 'tierFor(20, 65) must be human');

// Presets: the popup writes these sensitivities; nearest-match drives the active
// highlight. humanBadge has been removed from the settings model entirely.
assert(SS.PRESETS.length === 3, 'three presets');
assert(SS.presetForSensitivity(40).key === 'chill', 'sensitivity 40 → chill');
assert(SS.presetForSensitivity(65).key === 'default', 'sensitivity 65 → default');
assert(SS.presetForSensitivity(100).key === 'robot', 'sensitivity 100 → robot');
assert(SS.presetForSensitivity(58).key === 'default', 'sensitivity 58 → nearest is default');
assert(!('humanBadge' in SS.DEFAULT_SETTINGS), 'humanBadge removed from default settings');
assert(SS.thresholds(40).redact === 80, 'chill preset redacts at ≥ 80');
assert(SS.thresholds(100).redact === 50, 'robot preset redacts at ≥ 50');

// Shareable framing: tier labels and stable case numbers.
assert(SS.tierLabel(95) === 'WEAPONS-GRADE', 'tier 95 → WEAPONS-GRADE');
assert(SS.tierLabel(84) === 'INDUSTRIAL-GRADE', 'tier 84 → INDUSTRIAL-GRADE');
assert(SS.tierLabel(72) === 'CERTIFIED', 'tier 72 → CERTIFIED');
assert(/^LI-[0-9A-Z]{4}$/.test(SS.caseNumber('urn:li:activity:7000000000000000001')), 'case number format');
assert(
  SS.caseNumber('urn:x') === SS.caseNumber('urn:x') &&
    SS.caseNumber('urn:x') !== SS.caseNumber('urn:y'),
  'case number stable per urn, distinct across urns'
);

// Skip gates.
assert(SS.shouldSkip('too short to judge').skip, 'short text must skip');
assert(
  SS.shouldSkip(
    '本日、新しいプロジェクトを開始したことをお知らせします。長い間準備してきたもので、チーム全員がとても楽しみにしています。詳細は近日中に共有しますので、ぜひご期待ください。今後ともどうぞよろしくお願いいたします。皆様の応援が私たちの原動力です。引き続き温かく見守っていただけると嬉しいです。'
  ).reason === 'non-english',
  'non-ASCII text must skip as non-english'
);
assert(!SS.shouldSkip(FIXTURES[0].text).skip, 'normal English post must not skip');

// Robustness: malformed / non-string inputs must never throw.
for (const bad of [null, undefined, 12345, {}, [], NaN, '', '   ', '🚀'.repeat(50)]) {
  let threw = false;
  let total;
  try {
    SS.shouldSkip(bad);
    total = SS.scorePost(bad).total;
  } catch (e) {
    threw = true;
  }
  assert(!threw, `scorePost/shouldSkip must not throw on ${JSON.stringify(bad)}`);
  assert(total >= 0 && total <= 100 && !Number.isNaN(total), `score in range for ${JSON.stringify(bad)}`);
}

// Signal sanity: every signal returns [0, 1] on every fixture.
for (const f of FIXTURES) {
  const { breakdown } = SS.scorePost(f.text);
  for (const r of breakdown) {
    assert(
      r.score >= 0 && r.score <= 1,
      `${f.name}: signal ${r.key} out of [0,1]: ${r.score}`
    );
  }
}

// Serializer: DOM-shaped object tree → text with line breaks; slopshield UI skipped.
{
  const el = (tagName, className, childNodes) => ({ nodeType: 1, tagName, className, childNodes });
  const text = (nodeValue) => ({ nodeType: 3, nodeValue });
  const tree = el('DIV', '', [
    text('Line one.'),
    el('BR', '', []),
    el('BR', '', []),
    text('Line two.'),
    el('SPAN', 'slopshield-overlay', [text('IGNORE ME')]),
    el('P', '', [text('Para.')]),
  ]);
  const out = SS.serializeText(tree);
  assert(
    out === 'Line one.\n\nLine two.\nPara.\n',
    `serializeText mismatch: ${JSON.stringify(out)}`
  );
  assert(!out.includes('IGNORE'), 'serializeText must skip slopshield-* nodes');
  // Regression: a ROOT carrying .slopshield-host (overlay hosted on the text
  // body itself) must still serialize its children.
  const hostedRoot = el('DIV', 'update-components-text slopshield-host', [
    text('Still readable.'),
    el('SPAN', 'slopshield-overlay', [text('NOT THIS')]),
  ]);
  const hostedOut = SS.serializeText(hostedRoot).trim();
  assert(
    hostedOut === 'Still readable.' && !hostedOut.includes('NOT THIS'),
    `serializeText must not skip the root node: ${JSON.stringify(hostedOut)}`
  );
  // skipSelector prunes matching elements (the "...more" expander button on the
  // new LinkedIn stack); nodes without .matches (plain test trees) are unaffected.
  const expander = {
    nodeType: 1,
    tagName: 'BUTTON',
    className: '',
    childNodes: [text('…more')],
    matches: (sel) => sel.indexOf('expandable-text-button') !== -1,
  };
  const clamped = el('SPAN', '', [text('Real post text.'), expander]);
  const clampedOut = SS.serializeText(clamped, '[data-testid="expandable-text-button"]');
  assert(
    clampedOut.trim() === 'Real post text.' && !clampedOut.includes('more'),
    `serializeText must prune skipSelector matches: ${JSON.stringify(clampedOut)}`
  );
}

// Determinism: URN-seeded RNG is stable (same post → same verdict forever).
{
  const seedOf = (urn) => SS.fnv1a(urn);
  const a = SS.mulberry32(seedOf('urn:li:activity:7123456789'));
  const b = SS.mulberry32(seedOf('urn:li:activity:7123456789'));
  assert(
    [a(), a(), a()].join() === [b(), b(), b()].join(),
    'mulberry32 must be deterministic per seed'
  );
}

// Verdict ↔ signal matching: a signal-specific stamp may ONLY appear when that
// signal actually fired. This is the fix for "EM-DASH CRIME SCENE on a post with
// no em-dashes". Build a reverse map verdict→signal from the packs, then check
// every fixture's chosen verdict against what fired.
{
  const verdictSignal = {}; // verdict text → signal key (generic lines excluded)
  for (const tone of Object.keys(SS.VERDICTS)) {
    for (const key of Object.keys(SS.VERDICTS[tone])) {
      if (key === 'generic') continue;
      for (const line of SS.VERDICTS[tone][key]) verdictSignal[line] = key;
    }
  }

  for (const f of FIXTURES) {
    const { breakdown } = SS.scorePost(f.text);
    const firedKeys = new Set(breakdown.filter((r) => r.weighted > 0).map((r) => r.key));
    for (const tone of Object.keys(SS.VERDICTS)) {
      const v1 = SS.pickVerdict(f.name, tone, breakdown);
      const v2 = SS.pickVerdict(f.name, tone, breakdown);
      assert(v1.text === v2.text, `${f.name}/${tone}: verdict must be stable per urn+tone`);
      const named = verdictSignal[v1.text];
      if (named) {
        assert(
          firedKeys.has(named),
          `${f.name}/${tone}: verdict "${v1.text}" names ${named}, which did not fire`
        );
      }
    }
  }

  // The reported regression: thrilled-bullets has no em-dashes, so the em-dash
  // signal must not fire; which structurally makes an em-dash verdict impossible.
  const tb = SS.scorePost(FIXTURES.find((f) => f.name === 'slop-thrilled-bullets').text);
  const emDashRow = tb.breakdown.find((r) => r.key === 'emDash');
  assert(!emDashRow || emDashRow.weighted === 0, 'thrilled-bullets must not fire the em-dash signal');

  // topReasons surfaces the plain-English "flagged for" line.
  const reasons = SS.topReasons(tb.breakdown, 2);
  assert(reasons.length === 2 && reasons.every((s) => typeof s === 'string'), 'topReasons must name 2 signals');
}

// Scoring determinism + idempotence.
{
  const r1 = SS.scorePost(FIXTURES[0].text);
  const r2 = SS.scorePost(FIXTURES[0].text);
  assert(r1.total === r2.total, 'scorePost must be deterministic');
}

// Dogfood: the em-dash police must not be an em-dash crime scene. Every file a
// user can read ships with zero em/en dashes. Exempt because they are functional:
// signals.js (the detection regex), fixtures.js and harness.html (test data that
// exists to simulate slop).
{
  const fs = require('fs');
  const CLEAN_FILES = [
    'README.md',
    'PRIVACY.md',
    'store/LISTING.md',
    'manifest.json',
    'package.json',
    'LICENSE',
    'content/wordlists.js',
    'content/scorer.js',
    'content/extractor.js',
    'content/redactor.js',
    'content/content.js',
    'content/styles.css',
    'popup/popup.html',
    'popup/popup.js',
    'popup/popup.css',
    'background/service-worker.js',
    'scripts/gen-icons.js',
  ];
  for (const rel of CLEAN_FILES) {
    const full = path.join(__dirname, '..', rel);
    if (!fs.existsSync(full)) continue; // store docs land later in the build
    const body = fs.readFileSync(full, 'utf8');
    assert(!/[—–]/.test(body), `${rel}: contains an em/en dash; the em-dash police must be clean`);
  }
}

// --- summary -------------------------------------------------------------------

if (failures.length) {
  console.error(`  FAIL; ${failures.length} assertion(s):\n`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  console.error('');
  process.exitCode = 1;
} else {
  console.log('  PASS; all assertions green.\n');
}
