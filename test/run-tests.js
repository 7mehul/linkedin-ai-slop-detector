// SlopShield test runner — `npm test`.
// Prints a calibration table for every fixture, then runs hard assertions.
// Zero dependencies; loads the engine exactly the way Chrome does (classic
// scripts attaching to globalThis.SlopShield), minus the DOM-touching files.
'use strict';

const path = require('path');

// Engine load order mirrors manifest.json (DOM files excluded — they need a document).
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
    `  ${fixture.name.padEnd(34)}${fixture.expect.padEnd(12)}${String(result.total).padEnd(7)}${(result.bonusApplied ? 'x1.15' : '—').padEnd(7)}${rows.find((r) => r.fixture === fixture).top3}`
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
  // Borderlines are printed for eyeballing, not asserted — that is the bit.
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

// Skip gates.
assert(SS.shouldSkip('too short to judge').skip, 'short text must skip');
assert(
  SS.shouldSkip(
    '本日、新しいプロジェクトを開始したことをお知らせします。長い間準備してきたもので、チーム全員がとても楽しみにしています。詳細は近日中に共有しますので、ぜひご期待ください。今後ともどうぞよろしくお願いいたします。皆様の応援が私たちの原動力です。引き続き温かく見守っていただけると嬉しいです。'
  ).reason === 'non-english',
  'non-ASCII text must skip as non-english'
);
assert(!SS.shouldSkip(FIXTURES[0].text).skip, 'normal English post must not skip');

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
  const verdicts = SS.VERDICTS.medium;
  const idx1 = Math.floor(SS.mulberry32(seedOf('urn:x'))() * verdicts.length);
  const idx2 = Math.floor(SS.mulberry32(seedOf('urn:x'))() * verdicts.length);
  assert(idx1 === idx2, 'verdict pick must be stable per URN');
}

// Scoring determinism + idempotence.
{
  const r1 = SS.scorePost(FIXTURES[0].text);
  const r2 = SS.scorePost(FIXTURES[0].text);
  assert(r1.total === r2.total, 'scorePost must be deterministic');
}

// --- summary -------------------------------------------------------------------

if (failures.length) {
  console.error(`  FAIL — ${failures.length} assertion(s):\n`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  console.error('');
  process.exitCode = 1;
} else {
  console.log('  PASS — all assertions green.\n');
}
