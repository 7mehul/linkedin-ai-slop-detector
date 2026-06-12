// SlopShield — wordlists.js
// Phrase lists, verdict packs, and every LinkedIn DOM selector in one place.
// All matching downstream is lowercase + apostrophe-normalized (’ → ').
// Loaded as a classic script in the content-script world AND via require() in Node tests.
(() => {
  'use strict';
  const SS = (globalThis.SlopShield = globalThis.SlopShield || {});

  // ---------------------------------------------------------------------------
  // LinkedIn DOM selectors — the single most drift-prone artifact in the project.
  // When LinkedIn ships a redesign, this block is the only thing that should need edits.
  // ---------------------------------------------------------------------------
  SS.SELECTORS = {
    // One feed post. data-urn / data-id carry "urn:li:activity:..." and are the
    // most stable hooks LinkedIn exposes.
    POST_CONTAINER:
      'div.feed-shared-update-v2, [data-urn^="urn:li:activity"], [data-id^="urn:li:activity"]',
    // Post body text candidates, in preference order.
    TEXT_BODY:
      '.update-components-text, .feed-shared-update-v2__description, .feed-shared-inline-show-more-text, .feed-shared-text',
    // Wrappers holding a quoted/reposted update — text inside these belongs to the
    // quoted author, not the outer poster, so it is excluded from scoring.
    QUOTED_UPDATE:
      '.update-components-mini-update-v2, .feed-shared-update-v2__update-content-wrapper, .update-components-mini-update',
    // The "…see more" clamp wrapper (max-height + overflow:hidden). The redaction
    // overlay must be hosted ABOVE this element or the stamp gets clipped.
    CLAMP_WRAPPER: '.feed-shared-inline-show-more-text',
    // Feed scroll container — used for the zero-posts sanity warning.
    FEED_SCROLL: '.scaffold-finite-scroll__content',
  };

  // ---------------------------------------------------------------------------
  // Phrase lists. Original compilations. Lowercase. Multi-word entries are
  // matched with includes(); single words with word-boundary regexes.
  // ---------------------------------------------------------------------------

  SS.HOOK_PHRASES = [
    "i'm thrilled to announce",
    "thrilled to announce",
    "i'm humbled to share",
    "humbled and honored",
    "i'm excited to share",
    "excited to announce",
    'unpopular opinion',
    'hot take',
    'let that sink in',
    'read that again',
    "here's the thing",
    "here's what nobody tells you",
    'nobody tells you',
    "i don't usually post about",
    'i was today years old',
    'this changed everything',
    'changed everything for me',
    'nobody talks about this',
    'nobody is talking about',
    'a thread 🧵',
    '🧵',
    'i got rejected from',
    'they laughed when',
    'controversial but',
    'stop scrolling',
    'this might be the most important',
    'i made a mistake',
    'i need to be honest',
    'big news',
    'personal news',
    'i quit my job',
    'i fired myself',
  ];

  SS.CLOSER_PHRASES = [
    'agree?',
    'thoughts?',
    'what do you think?',
    'let me know in the comments',
    'drop a comment',
    'repost if',
    'follow me for more',
    'follow for more',
    'share this with someone who',
    'drop a 👍',
    'save this post',
    'what would you add?',
    'am i wrong?',
    'tag someone who',
    "if this resonated",
  ];

  SS.GENERIC_PHRASES = [
    'game-changer',
    'game changer',
    "in today's fast-paced world",
    "in today's rapidly evolving",
    "in today's digital age",
    "let's dive in",
    "let's unpack",
    'double down',
    'move the needle',
    'at its core',
    'a testament to',
    'the harsh truth',
    'the brutal truth',
    'the hard truth',
    'few understand this',
    'most people get this wrong',
    'most people miss this',
    'this is your sign',
    'take notes',
    'masterclass in',
    'lessons learned',
    'key takeaways',
    'food for thought',
    'the secret sauce',
    'next level',
    'level up',
  ];

  // The delve-family. Per-word, word-boundary matched (so "delves" hits via stem
  // entries below where useful). "journey" counts as-is per spec — no travel
  // disambiguation, the false positives are part of the bit.
  SS.AI_VOCAB = [
    'delve',
    'delves',
    'delving',
    'tapestry',
    'intricate',
    'meticulous',
    'meticulously',
    'commendable',
    'leverage',
    'leveraging',
    'unlock',
    'unlocking',
    'elevate',
    'elevating',
    'seamless',
    'seamlessly',
    'robust',
    'holistic',
    'synergy',
    'paradigm',
    'transformative',
    'groundbreaking',
    'ever-evolving',
    'harness',
    'harnessing',
    'foster',
    'fostering',
    'underscore',
    'underscores',
    'pivotal',
    'realm',
    'embark',
    'embarked',
    'journey',
    'testament',
    'beacon',
    'boast',
    'boasts',
  ];

  // Multi-word AI-vocab phrases, includes()-matched.
  SS.AI_VOCAB_PHRASES = ['navigate the landscape', 'navigating the landscape', 'in the realm of'];

  // Formulaic hedging that signals flat, riskless prose.
  SS.FAKE_HEDGES = [
    'it is important to note',
    "it's important to note",
    'it is worth noting',
    "it's worth noting",
    'needless to say',
    'it goes without saying',
    'at the end of the day',
    'when all is said and done',
  ];
  // Single-word fake hedges, word-boundary matched.
  SS.FAKE_HEDGE_WORDS = ['essentially', 'ultimately', 'fundamentally', 'arguably'];

  // Genuine-uncertainty markers — evidence of an actual human typing. Negative signal.
  // Word-boundary matched (short tokens would otherwise match inside words).
  SS.REAL_UNCERTAINTY = [
    'idk',
    'tbh',
    'imo',
    'imho',
    'lol',
    'lmao',
    'ngl',
    'fwiw',
    'afaik',
  ];
  SS.REAL_UNCERTAINTY_PHRASES = [
    'i could be wrong',
    'i might be wrong',
    'maybe i\'m wrong',
    'honestly not sure',
    'not sure if',
    'don\'t quote me',
    'take this with a grain of salt',
  ];

  // Vague-anecdote openers — the unfalsifiable parable cast.
  SS.VAGUE_ANECDOTE = [
    'a colleague once',
    'someone i mentored',
    'a founder i know',
    'a friend of mine recently',
    'i once met someone',
    'early in my career, someone',
    'a mentor once told me',
    'someone once told me',
    'a recruiter once',
    'my barista', // the canonical fake-parable protagonist
    'a stranger on the train',
  ];

  // Expanded (uncontracted) forms — counted as contraction *opportunities not taken*.
  SS.EXPANDED_FORMS = [
    'do not',
    'does not',
    'did not',
    'cannot',
    'can not',
    'will not',
    'would not',
    'could not',
    'should not',
    'is not',
    'are not',
    'was not',
    'were not',
    'have not',
    'has not',
    'it is',
    'that is',
    'there is',
    'i am',
    'i have',
    'i will',
    'i would',
    'we are',
    'we have',
    'you are',
    'they are',
    'let us',
  ];

  // Engagement-bait listicle nouns ("5 lessons", "7 things i learned"...).
  SS.LISTICLE_NOUNS =
    '(?:lessons?|things|ways|tips|rules|truths|reasons|mistakes|habits|signs|secrets|principles|frameworks|takeaways)';

  // ---------------------------------------------------------------------------
  // Verdict packs. Rule for every line: roast the WRITING, never the writer.
  // Picked per-post via URN-seeded RNG so the same post always wears the same stamp.
  // ---------------------------------------------------------------------------
  SS.VERDICTS = {
    mild: [
      'LIKELY SLOP',
      'AI-FLAVORED',
      'SUSPICIOUSLY POLISHED',
      'GHOSTWRITTEN BY A ROBOT?',
      'CERTIFIED CORPORATE CADENCE',
      'THE ALGORITHM WROTE THIS ONE',
      'BEIGE PROSE DETECTED',
      'TEMPLATE ENERGY',
      'FOCUS-GROUPED TO DEATH',
      'ASSEMBLED FROM PARTS',
    ],
    medium: [
      'CERTIFIED SLOP',
      'ChatGPT TOUCHED THIS',
      'THOUGHT LEADERSHIP™ DETECTED',
      'BROETRY VIOLATION',
      'EM-DASH CRIME SCENE',
      'THIS POST HAS BEEN RETURNED TO THE VOID',
      'ENGAGEMENT BAIT, DO NOT FEED',
      'WRITTEN BY A BLAZER',
      'PROMPT RESIDUE DETECTED',
      'STOCK PHOTO IN TEXT FORM',
    ],
    unhinged: [
      'WEAPONS-GRADE SLOP',
      'A ROBOT WEARING A LANYARD WROTE THIS',
      "THE PROMPT WAS 'WRITE A LINKEDIN POST'",
      'DELVE DETECTED. POST TERMINATED.',
      'THIS POST FOLDED ITS OWN LAUNDRY',
      '100% ORGANIC FREE-RANGE SLOP',
      'SOMEWHERE, AN EM-DASH FACTORY IS RUNNING OVERTIME',
      'LET THAT SINK IN? NO.',
      'THIS POST IS WEARING A SUIT TO THE BEACH',
      'GPT WROTE THIS AND IT WASN\'T EVEN TRYING',
    ],
  };
})();
