// SlopShield — test fixtures.
// 15 hand-written posts: 5 maximal slop, 5 obviously human, 5 borderline.
// Curly apostrophes (’) and real em-dashes (—) are used deliberately — that is
// what LinkedIn's editor emits, and the engine must handle them.
// Node-only file (the harness has its own inline mocks).

const FIXTURES = [
  // ---------------------------------------------------------------- slop ----
  {
    name: 'slop-broetry-meetings',
    expect: 'slop',
    text:
      'I made a mistake.\n\nFor 6 years, I said yes to every meeting.\n\nEvery single one.\n\nMy calendar was full — but my impact was empty.\n\nThen I tried something different.\n\nI deleted every recurring meeting without an agenda.\n\nThe result?\n\nMy team shipped more in one month than the entire previous quarter.\n\nIt’s not about doing more. It’s about doing what matters.\n\nStop attending. Start deciding.\n\nBusy is not the same as valuable — it never was.\n\nRead that again.\n\nAgree?',
  },
  {
    name: 'slop-thrilled-bullets',
    expect: 'slop',
    text:
      'I’m thrilled to announce that after 4 years of building in silence, we just crossed 10,000 users. 🚀\n\nHere are 5 lessons from the journey:\n\n🚀 Ship before you feel ready\n✅ Listen to churned users, not happy ones\n💡 Distribution beats product\n🔥 Hire slow, fire fast\n📈 Momentum is the only moat\n\nNone of this would be possible without this incredible community.\n\nIf this resonated, repost it ♻️\n\nFollow me for more lessons from the trenches.',
  },
  {
    name: 'slop-corporate-essay',
    expect: 'slop',
    text:
      'In today’s rapidly evolving landscape, the ability to leverage AI is no longer optional — it is essential. Organizations that delve into these transformative tools will unlock unprecedented value. Those that do not will struggle to remain relevant. It will reshape strategy, culture, and execution.\n\nIt is important to note that this shift is not about replacing people. It is about elevating them. When teams harness these robust capabilities, they do not simply move faster — they fundamentally reimagine what is possible.\n\nUltimately, the journey toward seamless adoption requires a holistic approach. Leaders must foster a culture of continuous learning. They must embark on this path with intention — and they must navigate the landscape with meticulous planning and groundbreaking vision.\n\nLet’s dive in. The future will not wait. Agree?',
  },
  {
    name: 'slop-network-parable',
    expect: 'slop',
    text:
      'A mentor once told me something I will never forget.\n\n"Your network is your net worth."\n\nI laughed.\n\nThen I got laid off in 2020.\n\nNo warning — no severance — nothing.\n\nGuess who got me my next role?\n\nNot my resume.\n\nNot my degree.\n\nA stranger on the train I had helped two years earlier.\n\nIt’s not what you know. It’s who helped you when it mattered.\n\nLet that sink in.\n\nYour network is the only resume that matters.\n\nNobody talks about this.\n\nThoughts?',
  },
  {
    name: 'slop-sales-listicle',
    expect: 'slop',
    text:
      'After 7 years in sales, I got promoted 5 times. 📈\n\nHere are 7 truths nobody tells you:\n\n1. Your manager is not your friend.\n\n2. Comp plans are designed by people who will never carry a quota.\n\n3. The best reps ask questions, not pitches.\n\n4. Pipeline, persistence, and patience win every quarter.\n\n5. Most people get this wrong.\n\n6. Activity is a game-changer when talent is equal.\n\n7. Discipline, consistency, and focus beat motivation, inspiration, and luck.\n\nThe harsh truth?\n\nMost people will read this list and change nothing.\n\nDon’t be most people.\n\nSave this post. You will want it later.\n\nWhat would you add?',
  },

  // --------------------------------------------------------------- human ----
  {
    name: 'human-debug-weekend',
    expect: 'human',
    text:
      'ok so i spent most of saturday chasing a race condition in our stripe webhook handler. turns out we were processing checkout.session.completed twice — once from the webhook and once from a cron job a contractor added in 2023 that nobody remembered. customers got double loyalty points for 14 months. tbh i only found it because a customer emailed asking why she had 9,412 points after spending $312. anyway. idempotency keys are now on every handler and i wrote a test that replays the last 1,000 events. cost of the bug: about $7,300 in rewards. cost of the fix: one saturday and my dignity lol',
  },
  {
    name: 'human-kubecon',
    expect: 'human',
    text:
      'Back from KubeCon. My feet hurt, I have 47 stickers I didn’t ask for, and I finally met three people I’d only known as GitHub avatars.\n\nReal highlights: the eBPF deep dive on day 2 (the presenter live-debugged a kernel panic, absolute legend), and a hallway conversation about etcd compaction that fixed a prod issue we’ve had since March.\n\nLowlight: $19 airport sandwich.\n\nIf you were there and we didn’t get to talk, my DMs are open. Already counting down to Atlanta next year.',
  },
  {
    name: 'human-pg-migration',
    expect: 'human',
    text:
      'We migrated from Postgres 14 to 16 over the weekend and I want to be honest about how it went: badly, then fine.\n\npg_upgrade itself took 11 minutes. What took 6 hours was discovering that our connection pooler pinned an ancient libpq, that two extensions weren’t packaged for 16 yet, and that a replication slot from a deleted analytics tool was silently holding back WAL cleanup.\n\nidk why I expected anything else. honestly not sure the runbook survives contact with any real database.\n\nIf you’re planning the same jump: check your extensions first, not last.',
  },
  {
    name: 'human-side-project',
    expect: 'human',
    text:
      'my side project hit 83 users today. not 100. 83.\n\ni know that’s nothing by linkedin standards but i built this thing at 11pm after my kid goes to bed and 19 of those users logged in twice yesterday. somebody in Brazil made a playlist at 3am my time. that one got me.\n\nnext up: fixing the password reset email that apparently goes straight to spam (sorry, all 9 of you who emailed lol)',
  },
  {
    name: 'human-honest-hiring',
    expect: 'human',
    text:
      'We’re hiring 2 backend engineers (Toronto, hybrid, $140k–$175k).\n\nReal talk about this codebase: it’s 9 years old, the billing module scares everyone including me, and there’s a file called utils2.js that we don’t speak of. You’d be engineer #14. We ship weekly, on-call is paid, and nobody’s sent a Slack message after 6pm since I’ve been here.\n\nNo ping-pong table. The coffee is fine. PTO is actually unlimited-with-a-floor (3 week minimum, enforced).\n\nDM me or apply via the link. If you ask about utils2.js in the interview I will be honest with you.',
  },

  // ---------------------------------------------------------- borderline ----
  {
    name: 'borderline-sincere-announcement',
    expect: 'borderline',
    text:
      'I’m excited to share that I’ve joined Maple Health as a Senior Product Designer.\n\nAfter five years at Shopify working on checkout, I wanted to get closer to healthcare, and this team’s mission of making diabetes care accessible genuinely convinced me during the interviews.\n\nThank you to everyone who helped me through the search — especially the three former colleagues who did mock portfolio reviews on their own weekends.\n\nExcited (and a little nervous) to start Monday.',
  },
  {
    name: 'borderline-formal-essay',
    expect: 'borderline',
    text:
      'Most discussions of technical debt conflate two different problems. The first is code that was written badly. The second is code that was written well for requirements that no longer exist. The distinction matters because the remedies are different. Bad code needs refactoring. Obsolete code needs deletion, which is cheaper but requires more courage. In my experience at three different companies, teams consistently overinvest in the first category and underinvest in the second. We spent eight months at my last job refactoring a service that should simply have been deleted. I do not think we were unusual.',
  },
  {
    name: 'borderline-promotion-thanks',
    expect: 'borderline',
    text:
      'Some personal news: as of this week I’m the Engineering Manager for the payments team at Flowbase.\n\nI joined four years ago as the second engineer on a team of five. I’ve broken prod twice, reviewed roughly 3,100 pull requests, and learned that the job is mostly about removing obstacles for people smarter than me.\n\nThank you Priya for betting on me when I was a mediocre interviewer with good references. I hope to pay that forward.\n\nWe’re hiring two senior engineers next quarter — DM me if payments infrastructure sounds like your kind of problem.',
  },
  {
    name: 'borderline-recruiting-listy',
    expect: 'borderline',
    text:
      'My team at Datawell is hiring a staff data engineer.\n\nWhat you’d work on:\n• Rebuilding our ingestion pipeline (Kafka to Iceberg)\n• Killing 4 legacy Airflow DAGs that wake someone up every week\n• Mentoring two earlier-career engineers\n\nWhat we offer: real ownership, a manager who writes code every Friday, and comp posted in the listing ($185k–$220k base).\n\nNo take-home longer than 2 hours. Interview loop is 4 conversations. We tell you our concerns before the final round so you can address them directly.\n\nApply at the link or DM me — happy to answer blunt questions.',
  },
  {
    name: 'borderline-earnest-advice',
    expect: 'borderline',
    text:
      'Advice I give every new grad on my team, written down because I keep repeating it:\n\nLearn to write a good ticket before you learn to write good code. A clear description of the problem is half the fix, and it is the half nobody teaches.\n\nAsk your questions in public channels. Yes, it feels embarrassing. The answer helps four silent people every time.\n\nKeep a brag document. Performance reviews reward memory, not impact, unless you write the impact down.\n\nNone of this is glamorous. All of it compounds.',
  },
];

module.exports = { FIXTURES };
