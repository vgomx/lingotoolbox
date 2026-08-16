import type { CEFRLevel, Card, Deck, LanguageCode, Note, Workspace } from './types';
import { START_EASE } from './scheduler';

export const WORKSPACES: Workspace[] = [
  { code: 'EN', name: 'English', flagHex: '1F1EC-1F1E7', color: 'var(--cyan-500)' },
  { code: 'PT', name: 'Portuguese', flagHex: '1F1E7-1F1F7', color: 'var(--mint-500)' },
  { code: 'NL', name: 'Dutch', flagHex: '1F1F3-1F1F1', color: 'var(--amber-500)' },
  { code: 'ES', name: 'Spanish', flagHex: '1F1EA-1F1F8', color: 'var(--coral-500)' },
];

/**
 * `released: false` marks a tool that is designed but not built — the rail flags
 * those with a "Soon" badge. Flip the flag when a tool ships.
 *
 * `blurb` says what the tool does for the learner, in their terms. It is the only
 * thing shown for a tool that isn't ready: whether the work is designed, drafted
 * or half-written is our business, not theirs, and telling them says nothing
 * about what they'd get.
 */
export const TOOLS = [
  { id: 'home', label: 'Home', short: 'Home', icon: 'house', path: 'home', accent: 'var(--brand)', released: true, blurb: 'Everything due today, at a glance.' },
  // The one short form that is not a shortening. The others drop a trailing
  // word and keep the head noun — Grammar Notes stays Grammar — but Cards
  // dropped the head noun itself, for a word this app already uses to mean the
  // individual item the sidebar counts. It fits the rail at 55 of 60px.
  { id: 'cards', label: 'Flashcards', short: 'Flashcards', icon: 'layers', path: 'cards', accent: 'var(--tool-flashcards)', released: true, blurb: 'Spaced repetition that schedules itself.' },
  // Roots and Verbs were not shortenings of anything — they were other names,
  // so the rail said one thing and the screen you landed on said another. Both
  // now drop the trailing word like the rest. Conjugation is the longest label
  // the rail carries, at 61 of the 64px the tile allows.
  { id: 'etymology', label: 'Etymology Explorer', short: 'Etymology', icon: 'git-branch', path: 'etymology', accent: 'var(--tool-etymology)', released: true, blurb: 'Trace a word back to its root.' },
  { id: 'conjugation', label: 'Conjugation Drill', short: 'Conjugation', icon: 'spell-check', path: 'conjugation', accent: 'var(--tool-conjugation)', released: true, blurb: 'Drill the verb forms you keep missing.' },
  { id: 'phrasebook', label: 'Phrasebook', short: 'Phrases', icon: 'message-square-quote', path: 'phrasebook', accent: 'var(--tool-phrasebook)', released: false, blurb: 'Keep whole phrases, not just single words.' },
  { id: 'grammar', label: 'Grammar Notes', short: 'Grammar', icon: 'scroll-text', path: 'grammar', accent: 'var(--tool-grammar)', released: true, blurb: 'Pull up a short explanation mid-review.' },
] as const;

export type ToolId = (typeof TOOLS)[number]['id'];

/**
 * The same tools, in the order anywhere that navigates should show them: what
 * you can use, then what you cannot.
 *
 * TOOLS above stays in roadmap order, which is how it reads as a declaration —
 * but the rail was rendering it literally, so Grammar Notes shipped behind
 * three tiles marked SOON. A working tool sat below three that only apologise.
 *
 * A derived order rather than a rearranged array, because the arrangement would
 * have to be maintained by hand at exactly the moment nobody is thinking about
 * the rail: flipping `released` to true here promotes the tool by itself. The
 * sort is stable — guaranteed by the spec since ES2019 — so within each group
 * the declaration order above is what survives.
 */
export const NAV_TOOLS = [...TOOLS].sort((a, b) => Number(b.released) - Number(a.released));

interface SeedCard {
  front: string;
  back: string;
  phonetic?: string;
  /**
   * OpenMoji codepoint from `openmojiCatalog.ts`, checked at build time by
   * `scripts/check-illustrations.mjs`.
   *
   * Set only where a picture genuinely helps — a concrete thing, or a face for a
   * feeling. Most of these decks are idioms and abstract adjectives, and hanging
   * an approximate glyph on "pragmatic" would teach the glyph, not the word.
   */
  illustration?: string;
  level?: CEFRLevel;
  /** Overrides the deck for a card that does not survive the trip. */
  reversed?: boolean;
  tags: string[];
}

interface SeedDeck {
  id: string;
  name: string;
  accent: string;
  /**
   * Whether this deck's cards are also asked backwards, meaning to word.
   *
   * On where the glosses point back at exactly one word — a market stall, a
   * verb, a station. Off where they do not: "yeah, exactly — agreeing with a
   * sigh" fits a dozen phrases, and asking for `pois é` from it would teach
   * guessing rather than the phrase.
   */
  reversed?: boolean;
  tags: string[];
  cards: SeedCard[];
}

/**
 * A starter workspace so the app is never empty on first open. Everything here is
 * ordinary vocabulary; the user can delete the decks and add their own.
 */
export const SEED: Record<LanguageCode, SeedDeck[]> = {
  EN: [
    {
      id: 'en-phrasal',
      reversed: true,
      name: 'Phrasal verbs',
      accent: 'var(--tool-flashcards)',
      tags: ['verbs'],
      cards: [
        { front: 'put off', back: 'to postpone — or to make someone lose interest', illustration: '23F0', level: 'B1', tags: ['verb'] },
        { front: 'bring up', back: 'to mention a subject, or to raise a child', illustration: '1F4AC', level: 'B1', tags: ['verb'] },
        { front: 'get by', back: 'to manage with just enough', illustration: '1F605', level: 'B2', tags: ['verb'] },
        { front: 'run into', back: 'to meet by chance', illustration: '1F44B', level: 'B1', tags: ['verb'] },
        { front: 'look after', back: 'to take care of', illustration: '1F9F8', level: 'A2', tags: ['verb'] },
        { front: 'call off', back: 'to cancel something already arranged', illustration: '274C', level: 'B1', tags: ['verb'] },
        { front: 'take on', back: 'to accept work or responsibility', illustration: '1F4AA', level: 'B2', tags: ['verb'] },
        { front: 'come across', back: 'to find by chance, or to give an impression', illustration: '1F440', level: 'B2', tags: ['verb'] },
        { front: 'put up with', back: 'to tolerate', level: 'B2', tags: ['verb'] },
        { front: 'get over', back: 'to recover from', level: 'B1', tags: ['verb'] },
        { front: 'turn down', back: 'to refuse, or to lower', illustration: '274C', level: 'B1', tags: ['verb'] },
        { front: 'work out', back: 'to figure out — and to exercise', illustration: '1F4AA', level: 'B1', tags: ['verb'] },
        { front: 'run out of', back: 'to have none left', level: 'A2', tags: ['verb'] },
        { front: 'bring about', back: 'to cause to happen', level: 'B2', tags: ['verb'] },
        { front: 'sort out', back: 'to fix or organise', level: 'B1', tags: ['verb'] },
        { front: 'go over', back: 'to review something carefully', illustration: '1F440', level: 'B1', tags: ['verb'] },
      ],
    },
    {
      id: 'en-precise',
      reversed: true,
      name: 'Words worth knowing',
      accent: 'var(--cyan-500)',
      tags: ['vocabulary'],
      cards: [
        { front: 'ubiquitous', back: 'found everywhere at once', phonetic: '/juːˈbɪkwɪtəs/', illustration: '1F30D', level: 'C1', tags: ['adj'] },
        { front: 'meticulous', back: 'careful about every small detail', phonetic: '/məˈtɪkjələs/', illustration: '1F52C', level: 'B2', tags: ['adj'] },
        { front: 'candid', back: 'honest, even when it is awkward', phonetic: '/ˈkændɪd/', illustration: '1F4AC', level: 'B2', tags: ['adj'] },
        { front: 'resilient', back: 'able to recover quickly', phonetic: '/rɪˈzɪliənt/', illustration: '1F4AA', level: 'B2', tags: ['adj'] },
        { front: 'ambiguous', back: 'open to more than one reading', phonetic: '/æmˈbɪɡjuəs/', illustration: '1F914', level: 'B2', tags: ['adj'] },
        { front: 'pragmatic', back: 'guided by what works rather than by theory', phonetic: '/præɡˈmætɪk/', level: 'B2', tags: ['adj'] },
        { front: 'succinct', back: 'said in few words', phonetic: '/səkˈsɪŋkt/', illustration: '2702', level: 'C1', tags: ['adj'] },
        { front: 'tenuous', back: 'so slight it barely holds', level: 'C1', tags: ['adj'] },
        { front: 'scrupulous', back: 'careful to do the right thing', level: 'C1', tags: ['adj'] },
        { front: 'innocuous', back: 'harmless, and duller than it looks', level: 'C1', tags: ['adj'] },
        { front: 'volatile', back: 'liable to change without warning', illustration: '1F525', level: 'B2', tags: ['adj'] },
        { front: 'astute', back: 'quick to see what matters', illustration: '1F440', level: 'C1', tags: ['adj'] },
        { front: 'redundant', back: 'more than is needed', level: 'B2', tags: ['adj'] },
      ],
    },
    {
      id: 'en-idioms',
      name: 'Everyday idioms',
      accent: 'var(--pink-500)',
      tags: ['idiom'],
      cards: [
        { front: 'hit the nail on the head', back: 'to be exactly right', illustration: '1F528', level: 'B2', tags: ['idiom'] },
        { front: 'under the weather', back: 'slightly unwell', illustration: '1F912', level: 'B1', tags: ['idiom'] },
        { front: 'the ball is in your court', back: 'it is your turn to act', illustration: '1F3BE', level: 'B2', tags: ['idiom'] },
        { front: 'cut corners', back: 'to do something cheaply or carelessly', illustration: '2702', level: 'B2', tags: ['idiom'] },
        { front: 'on the fence', back: 'undecided between two options', level: 'B2', tags: ['idiom'] },
        { front: 'a blessing in disguise', back: 'something bad that turns out well', illustration: '1F3AD', level: 'B2', tags: ['idiom'] },
        { front: 'the last straw', back: 'the small thing that finally breaks it', level: 'B2', tags: ['idiom'] },
        { front: 'bite the bullet', back: 'to get an unpleasant thing over with', level: 'B2', tags: ['idiom'] },
        { front: 'hit the sack', back: 'to go to bed', illustration: '1F634', level: 'B1', tags: ['idiom'] },
        { front: 'call it a day', back: 'to stop working for now', illustration: '23F0', level: 'B1', tags: ['idiom'] },
      ],
    },
    {
      id: 'en-directions',
      reversed: true,
      name: 'Getting around',
      accent: 'var(--mint-500)',
      tags: ['travel'],
      cards: [
        { front: 'platform', back: 'where you stand to wait for a train', illustration: '1F686', level: 'A2', tags: ['noun'] },
        { front: 'a stop', back: 'a place a bus or tram pulls in at', illustration: '1F68A', level: 'A1', tags: ['noun'] },
        { front: 'single ticket', back: 'one way only, with no return', level: 'A2', tags: ['noun'] },
        { front: 'return ticket', back: 'there and back on the same ticket', level: 'A2', tags: ['noun'] },
        { front: 'to catch a bus', back: 'to reach it in time and get on', illustration: '1F68C', level: 'A1', tags: ['verb'] },
        { front: 'to miss a train', back: 'to arrive after it has already gone', illustration: '1F682', level: 'A2', tags: ['verb'] },
        { front: 'to change at', back: 'to get off and take another line partway', level: 'A2', tags: ['verb'] },
        { front: 'timetable', back: 'the printed list of departure times', illustration: '23F0', level: 'A2', tags: ['noun'] },
        { front: 'head towards', back: 'to go in the direction of', level: 'A2', tags: ['phrase'] },
        { front: 'on your left', back: 'to your left', level: 'A1', tags: ['phrase'] },
        { front: 'the far end', back: 'the end furthest from here', level: 'B1', tags: ['phrase'] },
        { front: 'a dead end', back: 'a road with no way through', illustration: '274C', level: 'B1', tags: ['noun'] },
        { front: 'the crossing', back: 'where you walk across the road', level: 'A2', tags: ['noun'] },
        { front: 'two stops away', back: 'two stops from here', illustration: '1F68C', level: 'A2', tags: ['phrase'] },
        { front: 'the platform', back: 'where you wait for the train', illustration: '1F686', level: 'A2', tags: ['noun'] },
        { front: "it's a short walk", back: "it isn't far on foot", illustration: '1F45F', level: 'A2', tags: ['phrase'] },
      ],
    },
    {
      id: 'en-work',
      reversed: true,
      name: 'At work',
      accent: 'var(--amber-500)',
      tags: ['work'],
      cards: [
        { front: 'deadline', back: 'the day by which it has to be finished', illustration: '23F0', level: 'B1', tags: ['noun'] },
        { front: 'workload', back: 'how much there is for you to do', illustration: '1F4BB', level: 'B1', tags: ['noun'] },
        { front: 'a heads-up', back: 'a warning given early enough to act on', level: 'B2', tags: ['noun'] },
        { front: 'to chase up', back: 'to ask again about something still not done', level: 'B2', tags: ['verb'] },
        { front: 'to touch base', back: 'to make brief contact, just to check in', level: 'B2', tags: ['idiom'] },
        { front: 'to sign off on', back: 'to give something formal approval', level: 'B2', tags: ['verb'] },
        { front: 'a backlog', back: 'work that has piled up while you were elsewhere', level: 'B2', tags: ['noun'] },
        { front: 'to run something by someone', back: 'to check an idea with them before acting', level: 'B2', tags: ['verb'] },
        { front: 'the deliverable', back: 'the thing you owe by the deadline', illustration: '23F0', level: 'B2', tags: ['noun'] },
        { front: 'to loop someone in', back: 'to add them to the conversation', illustration: '1F4AC', level: 'B2', tags: ['phrase'] },
        { front: 'a blocker', back: 'the thing stopping the work', illustration: '274C', level: 'B2', tags: ['noun'] },
        { front: 'to follow up', back: 'to come back to it later', level: 'B1', tags: ['phrase'] },
        { front: 'the takeaway', back: 'the one thing worth remembering', illustration: '1F4DD', level: 'B2', tags: ['noun'] },
        { front: 'out of office', back: 'away, and not answering', illustration: '1F3E0', level: 'A2', tags: ['phrase'] },
      ],
    },
    // Abstract by nature, so no illustrations — see the note on SeedCard.
    {
      id: 'en-linking',
      reversed: true,
      name: 'Linking words',
      accent: 'var(--violet-500)',
      tags: ['grammar'],
      cards: [
        { front: 'however', back: 'but — starting a sentence rather than joining one', level: 'B1', tags: ['adverb'] },
        { front: 'therefore', back: 'for that reason', level: 'B1', tags: ['adverb'] },
        { front: 'moreover', back: 'and beyond that', level: 'B2', tags: ['adverb'] },
        { front: 'whereas', back: 'while, by contrast', level: 'B2', tags: ['conjunction'] },
        { front: 'nevertheless', back: 'in spite of what was just said', level: 'B2', tags: ['adverb'] },
        { front: 'hence', back: 'from this it follows', level: 'C1', tags: ['adverb'] },
        { front: 'albeit', back: 'although — before a short phrase, not a clause', level: 'C1', tags: ['conjunction'] },
        { front: 'notwithstanding', back: 'despite, in spite of', level: 'C1', tags: ['preposition'] },
        { front: 'provided that', back: 'as long as', level: 'B2', tags: ['linking'] },
        { front: 'in other words', back: 'put another way', level: 'B1', tags: ['linking'] },
        { front: 'even so', back: 'despite that', level: 'B2', tags: ['linking'] },
        { front: 'as a result', back: 'so, therefore', level: 'B1', tags: ['linking'] },
        { front: 'on the other hand', back: 'looking at the opposite side', level: 'B1', tags: ['linking'] },
        { front: 'that said', back: 'having admitted that', level: 'B2', tags: ['linking'] },
      ],
    },
  ],
  PT: [
    {
      id: 'pt-everyday',
      name: 'Everyday phrases',
      accent: 'var(--tool-flashcards)',
      tags: ['phrases'],
      cards: [
        { front: 'saudade', back: 'the presence of something absent', phonetic: '/sawˈdadʒi/', illustration: '1F97A', level: 'B1', tags: ['noun'] },
        { front: 'pois é', back: 'yeah, exactly — agreeing with a sigh', level: 'A2', tags: ['phrase'] },
        { front: 'né?', back: 'right? — tacked onto the end of almost anything', level: 'A1', tags: ['phrase'] },
        { front: 'dar uma volta', back: 'to go for a wander', illustration: '1F6B6', level: 'A2', tags: ['phrase'] },
        { front: 'tá tudo bem', back: 'everything is fine — está, worn down in speech', illustration: '1F44D', level: 'A1', tags: ['phrase'] },
        { front: 'sei lá', back: 'I dunno — a shrug with words', illustration: '1F914', level: 'A2', tags: ['phrase'] },
        { front: 'dar um jeitinho', back: 'to find a way around it, improvised', phonetic: '/daʁ ũ ʒejˈtʃĩɲu/', illustration: '1F527', level: 'B1', tags: ['phrase'] },
        { front: 'tudo bem?', back: 'everything good? — the standard hello', illustration: '1F44B', level: 'A1', tags: ['phrase'] },
        { front: 'valeu', back: 'cheers, thanks — informal', illustration: '1F44D', level: 'A2', tags: ['phrase'] },
        { front: 'nossa!', back: 'wow — from Nossa Senhora, and said constantly', level: 'A2', tags: ['phrase'] },
        { front: 'com licença', back: 'excuse me — when passing or leaving', level: 'A1', tags: ['phrase'] },
        { front: 'desculpa', back: 'sorry', illustration: '1F64F', level: 'A1', tags: ['phrase'] },
        { front: 'tá bom', back: 'alright, fine', level: 'A1', tags: ['phrase'] },
        { front: 'daqui a pouco', back: 'in a little while', illustration: '23F0', level: 'A2', tags: ['phrase'] },
        { front: 'de nada', back: "you're welcome", level: 'A1', tags: ['phrase'] },
        { front: 'beleza?', back: 'all good? — literally beauty', level: 'B1', tags: ['phrase'] },
      ],
    },
    {
      id: 'pt-false-friends',
      name: 'False friends',
      accent: 'var(--coral-500)',
      tags: ['traps'],
      cards: [
        { front: 'puxar', back: 'to pull — not to push', phonetic: '/puˈʃaʁ/', illustration: '1F6AA', level: 'A2', tags: ['verb'] },
        { front: 'pretender', back: 'to intend — not to pretend', phonetic: '/pɾetẽˈdeʁ/', level: 'B1', tags: ['verb'] },
        { front: 'esquisito', back: 'strange — not exquisite', phonetic: '/eskiˈzitu/', illustration: '1F928', level: 'B1', tags: ['adj'] },
        { front: 'livraria', back: 'bookshop — a library is a biblioteca', phonetic: '/livɾaˈɾia/', illustration: '1F4DA', level: 'A2', tags: ['noun'] },
        { front: 'pasta', back: 'folder or briefcase — the food is massa', illustration: '1F45C', level: 'A2', tags: ['noun'] },
        { front: 'êxito', back: 'success — not an exit', illustration: '1F3C6', level: 'B1', tags: ['noun'] },
        { front: 'assistir', back: 'to watch — not to assist', illustration: '1F440', level: 'A2', tags: ['verb'] },
        { front: 'costume', back: 'habit — not a costume', level: 'B1', tags: ['noun'] },
        { front: 'realizar', back: 'to carry out — only sometimes to realise', level: 'B1', tags: ['verb'] },
        { front: 'atualmente', back: 'currently — not actually', level: 'B1', tags: ['adv'] },
      ],
    },
    {
      id: 'pt-cafe',
      reversed: true,
      name: 'At the café',
      accent: 'var(--coral-500)',
      tags: ['food'],
      cards: [
        { front: 'um cafezinho', back: 'a small strong coffee — offered everywhere, all day', illustration: '2615', level: 'A1', tags: ['noun'] },
        { front: 'um pingado', back: 'coffee with a splash of milk', illustration: '1F95B', level: 'A2', tags: ['noun'] },
        { front: 'o cardápio', back: 'the menu', level: 'A1', tags: ['noun'] },
        { front: 'um pão de queijo', back: 'a cheese roll, eaten warm', illustration: '1F35E', level: 'A1', tags: ['noun'] },
        { front: 'um sanduíche', back: 'a sandwich', illustration: '1F96A', level: 'A1', tags: ['noun'] },
        { front: 'um suco de laranja', back: 'an orange juice — suco, where Portugal says sumo', illustration: '1F34A', level: 'A1', tags: ['noun'] },
        { front: 'um copo de água', back: 'a glass of water', illustration: '1F4A7', level: 'A1', tags: ['phrase'] },
        { front: 'a conta, por favor', back: 'the bill, please', level: 'A1', tags: ['phrase'] },
        { front: 'um pastel', back: 'a fried pastry, savoury', level: 'A2', tags: ['noun'] },
        { front: 'uma coxinha', back: 'a teardrop of shredded chicken in dough', level: 'A2', tags: ['noun'] },
        { front: 'um misto quente', back: 'a toasted ham and cheese', illustration: '1F9C0', level: 'A2', tags: ['noun'] },
        { front: 'sem açúcar', back: 'without sugar', level: 'A1', tags: ['phrase'] },
        { front: 'para viagem', back: 'to take away', level: 'A2', tags: ['phrase'] },
        { front: 'uma água com gás', back: 'sparkling water', level: 'A1', tags: ['noun'] },
        { front: 'está ótimo', back: "it's great", illustration: '1F60A', level: 'A1', tags: ['phrase'] },
      ],
    },
    {
      id: 'pt-verbs',
      reversed: true,
      name: 'Everyday verbs',
      accent: 'var(--cyan-500)',
      tags: ['verbs'],
      cards: [
        { front: 'levar', back: 'to take something with you when you go', level: 'A1', tags: ['verb'] },
        { front: 'trazer', back: 'to bring something with you when you come', level: 'A1', tags: ['verb'] },
        { front: 'pegar', back: 'to grab or pick up — and to catch', level: 'A1', tags: ['verb'] },
        { front: 'ter que', back: 'to have to', level: 'A2', tags: ['verb'] },
        { front: 'ficar', back: 'to stay, and also to become', level: 'A2', tags: ['verb'] },
        { front: 'dar certo', back: 'to work out, to come off', level: 'B1', tags: ['verb'] },
        { front: 'estar a fim de', back: 'to be up for something', level: 'B1', tags: ['verb'] },
        { front: 'se dar bem', back: 'to get on well with someone', level: 'B1', tags: ['verb'] },
        { front: 'dar', back: 'to give — and half the idioms in the language', level: 'A1', tags: ['verb'] },
        { front: 'conseguir', back: 'to manage to, to pull off', illustration: '1F4AA', level: 'B1', tags: ['verb'] },
        { front: 'precisar', back: 'to need', level: 'A1', tags: ['verb'] },
        { front: 'achar', back: 'to think, to reckon — and to find', illustration: '1F914', level: 'A2', tags: ['verb'] },
        { front: 'deixar', back: 'to leave something, to let', level: 'A2', tags: ['verb'] },
      ],
    },
    {
      id: 'pt-feelings',
      name: 'How you feel',
      accent: 'var(--pink-500)',
      tags: ['phrases'],
      cards: [
        { front: 'estou cansado', back: 'I am tired', illustration: '1F62A', level: 'A1', tags: ['phrase'] },
        { front: 'que pena', back: 'what a shame', illustration: '1F614', level: 'A2', tags: ['phrase'] },
        { front: 'estou com pressa', back: 'I am in a hurry', level: 'A2', tags: ['phrase'] },
        { front: 'fiquei surpreso', back: 'I was surprised', illustration: '1FAE2', level: 'A2', tags: ['phrase'] },
        { front: 'estou com preguiça', back: 'I cannot be bothered — the feeling has its own noun', illustration: '1F634', level: 'A2', tags: ['phrase'] },
        { front: 'que saco', back: 'what a drag', illustration: '1F644', level: 'B1', tags: ['phrase'] },
        { front: 'não aguento mais', back: 'I cannot take any more of it', illustration: '1F612', level: 'B1', tags: ['phrase'] },
        { front: 'estou de boa', back: 'I am fine — relaxed, nothing wrong', illustration: '1F60C', level: 'B1', tags: ['phrase'] },
        { front: 'com sono', back: 'sleepy', illustration: '1F634', level: 'A1', tags: ['phrase'] },
        { front: 'com pressa', back: 'in a hurry', illustration: '23F0', level: 'A2', tags: ['phrase'] },
        { front: 'com raiva', back: 'angry', illustration: '1F620', level: 'A2', tags: ['phrase'] },
        { front: 'com saudade', back: 'missing someone or somewhere', illustration: '1F614', level: 'B1', tags: ['phrase'] },
        { front: 'chateado', back: 'annoyed, upset', level: 'B1', tags: ['adj'] },
        { front: 'animado', back: 'excited, up for it', illustration: '1F389', level: 'A2', tags: ['adj'] },
        { front: 'cansado', back: 'tired', illustration: '1F634', level: 'A1', tags: ['adj'] },
        { front: 'tranquilo', back: 'relaxed — and also no worries', illustration: '1F642', level: 'A2', tags: ['adj'] },
      ],
    },
  ],
  NL: [
    {
      id: 'nl-everyday',
      name: 'Everyday phrases',
      accent: 'var(--tool-flashcards)',
      tags: ['phrases'],
      cards: [
        { front: 'gezellig', back: 'warm, companionable, good to be in', phonetic: '/ɣəˈzɛləx/', illustration: '2615', level: 'A2', tags: ['adj'] },
        { front: 'lekker', back: 'tasty — also just pleasant, for almost anything', phonetic: '/ˈlɛkər/', illustration: '1F60B', level: 'A1', tags: ['adj'] },
        { front: 'hoe gaat het', back: 'how are you', illustration: '1F44B', level: 'A1', tags: ['phrase'] },
        { front: 'alsjeblieft', back: 'please — and also here you go', phonetic: '/ɑlsjəˈblift/', illustration: '1F64F', level: 'A1', tags: ['phrase'] },
        { front: 'doe maar normaal', back: 'just act normal — a whole national attitude', illustration: '1F610', level: 'B1', tags: ['phrase'] },
        { front: 'afspraak', back: 'an appointment or an agreement', phonetic: '/ˈɑfspraːk/', illustration: '23F0', level: 'A2', tags: ['noun'] },
        { front: 'even', back: 'just, for a moment — softens any request', level: 'A1', tags: ['adv'] },
        { front: 'hoor', back: 'a tag that takes the edge off what you just said', level: 'A2', tags: ['particle'] },
        { front: 'het maakt niet uit', back: "it doesn't matter", level: 'A2', tags: ['phrase'] },
        { front: 'ik snap het', back: 'I get it', illustration: '1F642', level: 'A1', tags: ['phrase'] },
        { front: 'geen probleem', back: 'no problem', illustration: '1F44D', level: 'A1', tags: ['phrase'] },
        { front: 'tot straks', back: 'see you later today', illustration: '1F44B', level: 'A1', tags: ['phrase'] },
        { front: 'sorry, hoor', back: 'sorry — the hoor makes it lighter, not heavier', level: 'A2', tags: ['phrase'] },
        { front: 'dat is jammer', back: "that's a shame", illustration: '1F614', level: 'A2', tags: ['phrase'] },
        { front: 'weet je wat', back: 'you know what — the way a suggestion starts', level: 'B1', tags: ['phrase'] },
      ],
    },
    {
      id: 'nl-separable',
      reversed: true,
      name: 'Separable verbs',
      accent: 'var(--amber-500)',
      tags: ['verbs'],
      cards: [
        { front: 'opstaan', back: 'to get up — ik sta op', phonetic: '/ˈɔpstaːn/', illustration: '1F6CF', level: 'A2', tags: ['verb'] },
        { front: 'meenemen', back: 'to bring along — ik neem mee', phonetic: '/ˈmeːneːmə(n)/', illustration: '1F392', level: 'A2', tags: ['verb'] },
        { front: 'aankomen', back: 'to arrive — ik kom aan', phonetic: '/ˈaːnkoːmə(n)/', illustration: '2708', level: 'A2', tags: ['verb'] },
        { front: 'uitgaan', back: 'to go out — ik ga uit', phonetic: '/ˈœytɣaːn/', illustration: '1F6AA', level: 'A2', tags: ['verb'] },
        { front: 'afspreken', back: 'to arrange to meet — ik spreek af', phonetic: '/ˈɑfspreːkə(n)/', illustration: '1F91D', level: 'B1', tags: ['verb'] },
        { front: 'meevallen', back: 'to turn out better than feared', illustration: '1F605', level: 'B1', tags: ['verb'] },
        { front: 'weggaan', back: 'to leave — ik ga weg', illustration: '1F6AA', level: 'A2', tags: ['verb'] },
        { front: 'terugkomen', back: 'to come back — ik kom terug', level: 'A2', tags: ['verb'] },
        { front: 'opgeven', back: 'to give up — ik geef op', level: 'B1', tags: ['verb'] },
        { front: 'uitnodigen', back: 'to invite — ik nodig uit', illustration: '1F389', level: 'B1', tags: ['verb'] },
        { front: 'ophouden', back: 'to stop — hou op!', illustration: '274C', level: 'B1', tags: ['verb'] },
        { front: 'aanraken', back: 'to touch — raak niet aan', level: 'B1', tags: ['verb'] },
        { front: 'uitzoeken', back: 'to figure out, to pick out — ik zoek uit', illustration: '1F440', level: 'B2', tags: ['verb'] },
        { front: 'opschieten', back: 'to hurry up — schiet op!', illustration: '23F0', level: 'B1', tags: ['verb'] },
      ],
    },
    {
      id: 'nl-market',
      reversed: true,
      name: 'At the market',
      accent: 'var(--mint-500)',
      tags: ['food'],
      cards: [
        { front: 'het brood', back: 'bread', illustration: '1F35E', level: 'A1', tags: ['noun'] },
        { front: 'de kaas', back: 'cheese', illustration: '1F9C0', level: 'A1', tags: ['noun'] },
        { front: 'de aardappel', back: 'potato', illustration: '1F954', level: 'A1', tags: ['noun'] },
        { front: 'de ui', back: 'onion', illustration: '1F9C5', level: 'A1', tags: ['noun'] },
        { front: 'de appel', back: 'apple', illustration: '1F34E', level: 'A1', tags: ['noun'] },
        { front: 'lekker', back: 'tasty — and by extension, good in general', illustration: '1F60B', level: 'A1', tags: ['adj'] },
        { front: 'mag ik...?', back: 'may I have...?', level: 'A1', tags: ['phrase'] },
        { front: 'de rekening', back: 'the bill', level: 'A2', tags: ['noun'] },
        { front: 'de kip', back: 'chicken', level: 'A1', tags: ['noun'] },
        { front: 'het ei', back: 'egg', illustration: '1F95A', level: 'A1', tags: ['noun'] },
        { front: 'de vis', back: 'fish', illustration: '1F41F', level: 'A1', tags: ['noun'] },
        { front: 'de wortel', back: 'carrot', illustration: '1F955', level: 'A1', tags: ['noun'] },
        { front: 'het pond', back: '500 grams — what a Dutch market means by a pound', level: 'A2', tags: ['noun'] },
        { front: 'een onsje', back: '100 grams, roughly — always asked for in the diminutive', level: 'B1', tags: ['noun'] },
        { front: 'vers', back: 'fresh', level: 'A1', tags: ['adj'] },
        { front: 'goedkoop', back: 'cheap', illustration: '1F4B0', level: 'A1', tags: ['adj'] },
        { front: 'mag het ietsje meer zijn', back: 'can it be slightly more — the question every counter asks', level: 'B1', tags: ['phrase'] },
      ],
    },
    {
      id: 'nl-work',
      reversed: true,
      name: 'At work',
      accent: 'var(--amber-500)',
      tags: ['work'],
      cards: [
        { front: 'de collega', back: 'the colleague', level: 'A1', tags: ['noun'] },
        { front: 'de baas', back: 'the boss', level: 'A2', tags: ['noun'] },
        { front: 'de vergadering', back: 'the meeting', level: 'A2', tags: ['noun'] },
        { front: 'de afspraak', back: 'the appointment — and the agreement itself', level: 'A2', tags: ['noun'] },
        { front: 'het salaris', back: 'the salary', level: 'A2', tags: ['noun'] },
        { front: 'thuiswerken', back: 'to work from home', illustration: '1F3E0', level: 'A2', tags: ['verb'] },
        { front: 'het rooster', back: 'the schedule, the rota', illustration: '23F0', level: 'B1', tags: ['noun'] },
        { front: 'het overleg', back: 'talking it through together before deciding', level: 'B1', tags: ['noun'] },
        { front: 'de deadline', back: 'the deadline — borrowed whole', illustration: '23F0', level: 'A2', tags: ['noun'] },
        { front: 'even bellen', back: 'to give someone a quick call', level: 'A2', tags: ['phrase'] },
        { front: 'ik ben er even niet', back: "I'm away for a bit", level: 'B1', tags: ['phrase'] },
      ],
    },
    // Dutch particles: the hardest thing to look up and the easiest to drill.
    {
      id: 'nl-particles',
      name: 'Little words',
      accent: 'var(--violet-500)',
      tags: ['particles'],
      cards: [
        { front: 'even', back: 'just, briefly — takes the edge off a request', level: 'A2', tags: ['particle'] },
        { front: 'toch', back: 'all the same — or a nudge asking you to agree', level: 'B1', tags: ['particle'] },
        { front: 'wel', back: 'the yes to a no: "it is, actually"', level: 'B1', tags: ['particle'] },
        { front: 'hoor', back: 'tacked on the end to soften what came before', level: 'B1', tags: ['particle'] },
        { front: 'nou', back: 'well — a beat taken before answering', level: 'B1', tags: ['particle'] },
        { front: 'gezellig', back: 'warm, companionable, good to be in', level: 'B1', tags: ['adj'] },
        { front: 'maar', back: 'go on, help yourself — not the "but" you know', level: 'B2', tags: ['particle'] },
        { front: 'eens', back: 'sometime — turns an order into a suggestion', level: 'B2', tags: ['particle'] },
        { front: 'zeg', back: 'hey, say — tacked on to get attention', level: 'B1', tags: ['particle'] },
        { front: 'dus', back: 'so — often just a filler on the way to the point', level: 'A2', tags: ['particle'] },
        { front: 'echt waar', back: 'really? — said back to something surprising', illustration: '1F440', level: 'A2', tags: ['phrase'] },
        { front: 'eigenlijk', back: 'actually, when you think about it', illustration: '1F914', level: 'A2', tags: ['adv'] },
        { front: 'gewoon', back: 'just, simply — and also ordinary', level: 'A2', tags: ['adv'] },
        { front: 'misschien', back: 'maybe', level: 'A1', tags: ['adv'] },
      ],
    },
  ],
  ES: [
    {
      id: 'es-kitchen',
      reversed: true,
      name: 'Kitchen Spanish',
      accent: 'var(--tool-flashcards)',
      tags: ['food'],
      cards: [
        { front: 'sobremesa', back: 'the long talk after a meal', phonetic: '/so.bɾeˈme.sa/', illustration: '1F4AC', level: 'B1', tags: ['noun'] },
        { front: 'la sartén', back: 'the frying pan', phonetic: '/la saɾˈten/', illustration: '1F373', level: 'A1', tags: ['noun'] },
        { front: 'hervir', back: 'to boil', phonetic: '/eɾˈβiɾ/', illustration: '1F372', level: 'A2', tags: ['verb'] },
        { front: 'el fregadero', back: 'the kitchen sink', phonetic: '/el fɾe.ɣaˈðe.ɾo/', illustration: '1F9FC', level: 'A2', tags: ['noun'] },
        { front: 'picar', back: 'to chop, or to snack', phonetic: '/piˈkaɾ/', illustration: '1F955', level: 'A2', tags: ['verb'] },
        { front: 'a fuego lento', back: 'on a low heat', phonetic: '/a ˈfwe.ɣo ˈlen.to/', illustration: '1F525', level: 'B1', tags: ['phrase'] },
        { front: 'el aliño', back: 'the dressing', phonetic: '/el aˈli.ɲo/', illustration: '1F957', level: 'B1', tags: ['noun'] },
        { front: 'soso', back: 'bland, under-salted', phonetic: '/ˈso.so/', illustration: '1F615', level: 'B1', tags: ['adj'] },
        { front: 'el horno', back: 'the oven', illustration: '1F525', level: 'A1', tags: ['noun'] },
        { front: 'la olla', back: 'the pot', level: 'A1', tags: ['noun'] },
        { front: 'el cuchillo', back: 'the knife', level: 'A1', tags: ['noun'] },
        { front: 'probar', back: 'to taste — and to try anything', level: 'A2', tags: ['verb'] },
        { front: 'aliñar', back: 'to dress a salad', level: 'B1', tags: ['verb'] },
        { front: 'el aceite de oliva', back: 'olive oil', level: 'A1', tags: ['noun'] },
        { front: 'a la plancha', back: 'cooked on the griddle', level: 'A2', tags: ['phrase'] },
        { front: 'está riquísimo', back: "it's delicious — the -ísimo does the work", illustration: '1F60A', level: 'A2', tags: ['phrase'] },
      ],
    },
    {
      id: 'es-idioms',
      name: 'Idioms that lie',
      accent: 'var(--coral-500)',
      tags: ['idiom'],
      cards: [
        { front: 'estar en las nubes', back: 'to be daydreaming', phonetic: '/esˈtaɾ en las ˈnu.βes/', illustration: '2601', level: 'B2', tags: ['idiom'] },
        { front: 'ser pan comido', back: 'to be very easy', phonetic: '/seɾ pan koˈmi.ðo/', illustration: '1F35E', level: 'B2', tags: ['idiom'] },
        { front: 'tomar el pelo', back: 'to pull someone’s leg', phonetic: '/toˈmaɾ el ˈpe.lo/', illustration: '1F61C', level: 'B2', tags: ['idiom'] },
        { front: 'no tener pelos en la lengua', back: 'to speak bluntly', phonetic: '/no teˈneɾ ˈpe.los/', illustration: '1F624', level: 'C1', tags: ['idiom'] },
        { front: 'echar de menos', back: 'to miss someone', phonetic: '/eˈtʃaɾ de ˈme.nos/', illustration: '1F494', level: 'B1', tags: ['idiom'] },
        { front: 'dar en el clavo', back: 'to hit the nail on the head', phonetic: '/daɾ en el ˈkla.βo/', illustration: '1F528', level: 'B2', tags: ['idiom'] },
        { front: 'costar un ojo de la cara', back: 'to cost an eye from your face', illustration: '1F440', level: 'B2', tags: ['idiom'] },
        { front: 'estar como una cabra', back: 'to be completely mad', level: 'B2', tags: ['idiom'] },
        { front: 'ponerse las pilas', back: 'to get your act together — put your batteries in', illustration: '1F4AA', level: 'B1', tags: ['idiom'] },
        { front: 'tirar la toalla', back: 'to throw in the towel', level: 'B1', tags: ['idiom'] },
      ],
    },
    {
      id: 'es-verbs',
      reversed: true,
      name: 'Irregular verbs',
      accent: 'var(--pink-500)',
      tags: ['verbs'],
      cards: [
        { front: 'caber', back: 'to fit — yo quepo', phonetic: '/kaˈβeɾ/', level: 'B1', tags: ['verb'] },
        { front: 'oír', back: 'to hear — yo oigo', phonetic: '/oˈiɾ/', illustration: '1F442', level: 'A2', tags: ['verb'] },
        { front: 'traer', back: 'to bring — yo traigo', phonetic: '/tɾaˈeɾ/', illustration: '1F381', level: 'A2', tags: ['verb'] },
        { front: 'saber', back: 'to know — yo sé', phonetic: '/saˈβeɾ/', illustration: '1F9E0', level: 'A1', tags: ['verb'] },
        { front: 'poder', back: 'to be able — yo puedo', phonetic: '/poˈðeɾ/', illustration: '1F4AA', level: 'A1', tags: ['verb'] },
        { front: 'huir', back: 'to flee — yo huyo', phonetic: '/wiɾ/', illustration: '1F3C3', level: 'B1', tags: ['verb'] },
        { front: 'valer', back: 'to be worth — yo valgo', phonetic: '/baˈleɾ/', illustration: '1F4B0', level: 'B1', tags: ['verb'] },
        { front: 'venir', back: 'to come — vengo, vienes, viene', level: 'A1', tags: ['verb'] },
        { front: 'poner', back: 'to put — pongo, and puse in the preterite', level: 'A2', tags: ['verb'] },
        { front: 'salir', back: 'to leave, to go out — salgo', illustration: '1F6AA', level: 'A1', tags: ['verb'] },
        { front: 'conocer', back: 'to know a person or place — conozco', illustration: '1F91D', level: 'A2', tags: ['verb'] },
        { front: 'pedir', back: 'to ask for — pido, pidió', level: 'A2', tags: ['verb'] },
        { front: 'dormir', back: 'to sleep — duermo, durmió', illustration: '1F634', level: 'A1', tags: ['verb'] },
      ],
    },
    {
      id: 'es-travel',
      reversed: true,
      name: 'Getting around',
      accent: 'var(--cyan-500)',
      tags: ['travel'],
      cards: [
        { front: 'el billete', back: 'the ticket (in Spain; el boleto elsewhere)', level: 'A1', tags: ['noun'] },
        { front: 'la estación', back: 'the station', illustration: '1F686', level: 'A1', tags: ['noun'] },
        { front: 'la parada', back: 'the stop', illustration: '1F68C', level: 'A1', tags: ['noun'] },
        { front: 'el andén', back: 'the platform', level: 'A2', tags: ['noun'] },
        { front: 'ida y vuelta', back: 'there and back', level: 'A2', tags: ['phrase'] },
        { front: 'el horario', back: 'the timetable', illustration: '23F0', level: 'A2', tags: ['noun'] },
        { front: 'perder el tren', back: 'to miss the train', illustration: '1F682', level: 'A2', tags: ['verb'] },
        { front: 'hacer transbordo', back: 'to change lines partway', level: 'B1', tags: ['verb'] },
        { front: 'la vuelta', back: 'the change, and the return', level: 'A2', tags: ['noun'] },
        { front: 'perderse', back: 'to get lost', level: 'A2', tags: ['verb'] },
        { front: 'a la vuelta de la esquina', back: 'just around the corner', level: 'B1', tags: ['phrase'] },
        { front: '¿está lejos?', back: 'is it far?', level: 'A1', tags: ['phrase'] },
        { front: 'todo recto', back: 'straight ahead', level: 'A1', tags: ['phrase'] },
      ],
    },
    {
      id: 'es-feelings',
      name: 'Moods',
      accent: 'var(--pink-500)',
      tags: ['phrases'],
      cards: [
        { front: 'me da igual', back: 'it is all the same to me', illustration: '1F610', level: 'A2', tags: ['phrase'] },
        { front: 'qué pena', back: 'what a shame', illustration: '1F614', level: 'A2', tags: ['phrase'] },
        { front: 'tengo ganas de', back: 'I feel like doing it', illustration: '1F60B', level: 'A2', tags: ['phrase'] },
        { front: 'estoy harto', back: 'I have had enough of it', illustration: '1F612', level: 'B1', tags: ['phrase'] },
        { front: 'qué rollo', back: 'what a drag', illustration: '1F644', level: 'B1', tags: ['phrase'] },
        { front: 'me hace ilusión', back: 'I am looking forward to it', illustration: '1F929', level: 'B1', tags: ['phrase'] },
        { front: 'estoy hecho polvo', back: 'I am shattered — literally, turned to dust', illustration: '1F62A', level: 'B1', tags: ['phrase'] },
        { front: 'me da corte', back: 'it makes me self-conscious', illustration: '1FAE2', level: 'B1', tags: ['phrase'] },
        { front: 'tener ganas de', back: 'to feel like doing something', level: 'A2', tags: ['phrase'] },
        { front: 'estar harto', back: 'to be fed up', illustration: '1F624', level: 'B1', tags: ['phrase'] },
        { front: 'darle vergüenza', back: 'to be embarrassed — the shame gives itself to you', illustration: '1F971', level: 'B1', tags: ['phrase'] },
        { front: 'estar agobiado', back: 'to be overwhelmed', illustration: '1F630', level: 'B1', tags: ['adj'] },
        { front: 'qué rabia', back: 'how annoying', illustration: '1F620', level: 'B1', tags: ['phrase'] },
        { front: 'estar ilusionado', back: 'to be excited about something coming', illustration: '1F389', level: 'B1', tags: ['adj'] },
        { front: 'tener sueño', back: 'to be sleepy', illustration: '1F634', level: 'A1', tags: ['phrase'] },
      ],
    },
    {
      id: 'es-linking',
      reversed: true,
      name: 'Linking words',
      accent: 'var(--violet-500)',
      tags: ['grammar'],
      cards: [
        { front: 'aunque', back: 'although', level: 'A2', tags: ['conjunction'] },
        { front: 'sin embargo', back: 'however', level: 'B1', tags: ['phrase'] },
        { front: 'por lo tanto', back: 'therefore', level: 'B1', tags: ['phrase'] },
        { front: 'además', back: 'moreover, and beyond that', level: 'B1', tags: ['adverb'] },
        { front: 'mientras que', back: 'whereas, by contrast', level: 'B2', tags: ['phrase'] },
        { front: 'a pesar de', back: 'in spite of', level: 'B2', tags: ['phrase'] },
        { front: 'no obstante', back: 'nevertheless', level: 'C1', tags: ['phrase'] },
        { front: 'de ahí que', back: 'hence, and that is why', level: 'C1', tags: ['phrase'] },
        { front: 'en cambio', back: 'whereas, on the other hand', level: 'B1', tags: ['linking'] },
        { front: 'o sea', back: 'that is to say — and a filler everywhere', level: 'B1', tags: ['linking'] },
        { front: 'de hecho', back: 'in fact', level: 'B1', tags: ['linking'] },
      ],
    },
  ],
};

/**
 * Deterministic, so seeding twice overwrites the same rows rather than inserting
 * a second copy of every starter card. User-created cards get random ids instead.
 */
const id = (deckId: string, index: number) => `${deckId}-${index}`;

/**
 * Builds the starter decks and cards. Cards are staggered so the first session has
 * a realistic mix rather than everything arriving new at once.
 */
/**
 * One seeded deck, turned into records.
 *
 * Split out of buildSeed so a pack added from the catalogue months later is
 * built by the same rule as one that shipped with the app — the alternative is
 * two places that decide what a new deck's cards look like, which drift.
 */
export function buildDeck(language: LanguageCode, seedDeck: SeedDeck, now: number): { deck: Deck; cards: Card[] } {
  const deck: Deck = {
    id: seedDeck.id,
    language,
    name: seedDeck.name,
    accent: seedDeck.accent,
    reversed: seedDeck.reversed,
    tags: seedDeck.tags,
    createdAt: now,
  };
  const cards: Card[] = seedDeck.cards.map((c, i) => {
    // Roughly half of each deck starts as review cards already due, so the
    // first session isn't a wall of brand-new words.
    const seeded = i % 2 === 0 && i < 6;
    return {
      id: id(seedDeck.id, i),
      deckId: seedDeck.id,
      front: c.front,
      back: c.back,
      phonetic: c.phonetic,
      illustration: c.illustration,
      tags: c.tags,
      level: c.level,
      // The deck's answer, unless the card carries its own.
      reversed: c.reversed ?? seedDeck.reversed,
      createdAt: now,
      state: seeded ? 'review' : 'new',
      due: seeded ? now - (i + 1) * 60 * 60 * 1000 : now,
      interval: seeded ? 1 + i : 0,
      ease: START_EASE,
      reps: seeded ? 1 + i : 0,
      lapses: 0,
    };
  });
  return { deck, cards };
}

export function buildSeed(now: number = Date.now()): { decks: Deck[]; cards: Card[] } {
  const decks: Deck[] = [];
  const cards: Card[] = [];

  (Object.keys(SEED) as LanguageCode[]).forEach((language) => {
    SEED[language].forEach((seedDeck) => {
      decks.push({
        id: seedDeck.id,
        language,
        name: seedDeck.name,
        accent: seedDeck.accent,
        reversed: seedDeck.reversed,
        tags: seedDeck.tags,
        createdAt: now,
      });

      seedDeck.cards.forEach((c, i) => {
        // Roughly half of each deck starts as review cards already due, so the
        // first session isn't a wall of brand-new words.
        const seeded = i % 2 === 0 && i < 6;
        cards.push({
          id: id(seedDeck.id, i),
          deckId: seedDeck.id,
          front: c.front,
          back: c.back,
          phonetic: c.phonetic,
          illustration: c.illustration,
          tags: c.tags,
          level: c.level,
          // The deck's answer, unless the card carries its own.
          reversed: c.reversed ?? seedDeck.reversed,
          createdAt: now,
          state: seeded ? 'review' : 'new',
          due: seeded ? now - (i + 1) * 60 * 60 * 1000 : now,
          interval: seeded ? 1 + i : 0,
          ease: START_EASE,
          reps: seeded ? 1 + i : 0,
          lapses: 0,
        });
      });
    });
  });

  return { decks, cards };
}

interface SeedNote {
  id: string;
  title: string;
  body: string;
  examples?: { form: string; gloss: string }[];
  tags: string[];
  level?: CEFRLevel;
}

/**
 * The starter notes: the handful of rules a learner of each language keeps
 * having to look up.
 *
 * Tagged in the same words the cards are, because that is the whole join — a
 * note is offered on a card when they share a tag. `noun` reaches every noun
 * card in the workspace, which is what a note about articles wants.
 *
 * Each is short on purpose. A rule you have to scroll is one you will not read
 * halfway through a review, which is the moment this exists for.
 */
export const SEED_NOTES: Record<LanguageCode, SeedNote[]> = {
  EN: [
    {
      id: 'en-phrasal-split',
      title: 'Can I split a phrasal verb?',
      body: 'Some phrasal verbs take an object between the two parts, some do not.\n\nIf the object is a pronoun it must go in the middle — "turn it off", never "turn off it". With a noun, either position works.\n\nA few never split at all: you run into someone, never run someone into.',
      examples: [
        { form: 'turn the light off / turn off the light', gloss: 'both fine' },
        { form: 'turn it off', gloss: 'pronoun must sit in the middle' },
        { form: 'I ran into Ana', gloss: 'never splits' },
      ],
      tags: ['verb'],
      level: 'B1',
    },
    {
      id: 'en-present-perfect',
      title: 'Present perfect or past simple?',
      body: 'Past simple puts the event in a finished time — yesterday, last year, when I was ten.\n\nPresent perfect leaves the time open, so the event still counts now. It is the difference between reporting and connecting.',
      examples: [
        { form: 'I saw her yesterday', gloss: 'finished time, so past simple' },
        { form: 'I have seen her', gloss: 'sometime up to now' },
      ],
      tags: ['verb'],
      level: 'B1',
    },
    {
      id: 'en-articles',
      title: 'a, the, or nothing?',
      body: 'Use "a" the first time something comes up, "the" once both of you know which one is meant.\n\nPlurals and uncountables take no article when you mean them in general — "I like music", not "the music".',
      examples: [
        { form: 'I bought a book. The book was awful.', gloss: 'introduced, then known' },
        { form: 'Bread is expensive', gloss: 'bread in general takes nothing' },
      ],
      tags: ['noun'],
      level: 'A2',
    },
    {
      id: 'en-adjective-order',
      title: 'What order do adjectives go in?',
      body: 'Opinion, then size, then age, then colour, then origin, then material. Nobody is taught this and everybody follows it.\n\nGet it wrong and the sentence is understood but sounds off: "a green lovely big bag".',
      examples: [{ form: 'a lovely big old green Italian leather bag', gloss: 'the order in full' }],
      tags: ['adj'],
      level: 'B2',
    },
    {
      id: 'en-however',
      title: 'however, but, or although?',
      body: '"but" joins two halves of one sentence. "however" starts a new one and takes a comma. "although" opens a subordinate clause and cannot stand alone.',
      examples: [
        { form: 'It rained, but we went.', gloss: 'one sentence' },
        { form: 'It rained. However, we went.', gloss: 'new sentence' },
        { form: 'Although it rained, we went.', gloss: 'clause, needs the second half' },
      ],
      tags: ['adverb', 'conjunction'],
      level: 'B2',
    },
    {
      id: 'en-countable',
      title: 'much, many, a lot of?',
      body: '"many" counts things, "much" measures stuff. "a lot of" covers both and is what people actually say.\n\n"much" in a positive statement sounds formal or wrong — "I have much time" is not something anyone says.',
      examples: [
        { form: 'many cards / much time', gloss: 'countable / uncountable' },
        { form: 'a lot of cards, a lot of time', gloss: 'safe either way' },
      ],
      tags: ['noun'],
      level: 'A2',
    },
  ],
  PT: [
    {
      id: 'pt-ser-estar',
      title: 'ser or estar?',
      body: 'Both are "to be". ser is what something is; estar is how it happens to be right now.\n\nThe same adjective changes meaning depending on which you pick, which is the part worth remembering.',
      examples: [
        { form: 'ele é chato', gloss: 'he is boring — as a person' },
        { form: 'ele está chato', gloss: 'he is being annoying — today' },
        { form: 'sou brasileiro / estou cansado', gloss: 'what I am / how I am' },
      ],
      tags: ['verb'],
      level: 'A2',
    },
    {
      id: 'pt-gerund',
      title: 'estou fazendo, not estou a fazer',
      body: 'Brazilian Portuguese builds the continuous with the gerund: estar plus the -ndo form.\n\nThe "a + infinitive" you may have seen is European. Both are understood everywhere, but only one sounds native here.',
      examples: [
        { form: 'estou trabalhando', gloss: 'I am working — Brazil' },
        { form: 'estou a trabalhar', gloss: 'the same, in Portugal' },
      ],
      tags: ['verb'],
      level: 'A2',
    },
    {
      id: 'pt-voce',
      title: 'você, tu, or a gente?',
      body: 'você is the everyday "you" in most of Brazil, and it takes the same verb form as ele.\n\ntu survives in the south and northeast, often with você endings. And a gente has quietly replaced nós in speech — it means "we" but conjugates as "he".',
      examples: [
        { form: 'você fala / ele fala', gloss: 'same ending' },
        { form: 'a gente vai', gloss: 'we go — singular verb' },
      ],
      tags: ['phrase'],
      level: 'A1',
    },
    {
      id: 'pt-contractions',
      title: 'no, na, do, da',
      body: 'Prepositions swallow the article that follows them, and it is not optional.\n\nem + o = no, em + a = na, de + o = do, de + a = da. Writing "em o" marks you out instantly.',
      examples: [
        { form: 'no mercado', gloss: 'em + o mercado' },
        { form: 'da minha irmã', gloss: 'de + a minha irmã' },
      ],
      tags: ['preposition', 'noun'],
      level: 'A1',
    },
    {
      id: 'pt-por-para',
      title: 'por or para?',
      body: 'para points forward — a destination, a purpose, a recipient. por is the reason behind, the route through, or the exchange.',
      examples: [
        { form: 'vou para São Paulo', gloss: 'heading there' },
        { form: 'passei por São Paulo', gloss: 'went through' },
        { form: 'obrigado por tudo', gloss: 'in return for' },
      ],
      tags: ['preposition'],
      level: 'B1',
    },
    {
      id: 'pt-diminutive',
      title: 'Why is everything -inho?',
      body: 'The -inho ending is not only about size. It softens, warms, or makes something casual — a cafezinho is not a small coffee so much as a friendly one.\n\nIt goes on nouns, adjectives, even adverbs: rapidinho, agorinha.',
      examples: [
        { form: 'um cafezinho', gloss: 'a coffee, offered warmly' },
        { form: 'rapidinho', gloss: 'in a jiffy' },
      ],
      tags: ['noun'],
      level: 'B1',
    },
  ],
  NL: [
    {
      id: 'nl-de-het',
      title: 'de or het?',
      body: 'Roughly two thirds of nouns take de and there is no reliable rule, so the article is part of the word — learn "het brood", never "brood".\n\nWhat is predictable: every plural takes de, and every diminutive takes het.',
      examples: [
        { form: 'het huis / de huizen', gloss: 'plural is always de' },
        { form: 'het huisje', gloss: 'diminutives are always het' },
      ],
      tags: ['noun'],
      level: 'A1',
    },
    {
      id: 'nl-separable',
      title: 'Separable verbs come apart',
      body: 'A separable verb splits in a main clause: the prefix goes to the very end, however far away that is.\n\nIn a subordinate clause it stays whole. That is the tell for which kind of clause you are in.',
      examples: [
        { form: 'ik neem het boek mee', gloss: 'meenemen, split' },
        { form: '... omdat ik het boek meeneem', gloss: 'whole again' },
      ],
      tags: ['verb'],
      level: 'A2',
    },
    {
      id: 'nl-word-order',
      title: 'The verb goes second',
      body: 'In a Dutch main clause the finite verb is the second element, whatever comes first.\n\nPut something else at the front for emphasis and the subject moves behind the verb. Any other verbs pile up at the end.',
      examples: [
        { form: 'ik ga morgen naar Amsterdam', gloss: 'subject first' },
        { form: 'morgen ga ik naar Amsterdam', gloss: 'verb still second' },
      ],
      tags: ['verb'],
      level: 'A2',
    },
    {
      id: 'nl-er',
      title: 'What is er doing there?',
      body: 'er does four different jobs and is usually untranslatable.\n\nIt props up sentences with no real subject, stands in for a place, carries a number, and pairs with prepositions when the thing is not a person.',
      examples: [
        { form: 'er is een probleem', gloss: 'there is a problem' },
        { form: 'ik ben er nooit geweest', gloss: 'there, a place' },
        { form: 'ik denk er niet aan', gloss: 'about it' },
      ],
      tags: ['particle'],
      level: 'B1',
    },
    {
      id: 'nl-particles',
      title: 'toch, wel, even, hoor',
      body: 'These carry the tone, not the meaning, and Dutch without them sounds blunt to the point of rude.\n\nThey are the difference between an instruction and a request.',
      examples: [
        { form: 'kom even hier', gloss: 'pop over — softens it' },
        { form: 'dat is toch mooi?', gloss: 'nudges you to agree' },
        { form: 'het is niet duur hoor', gloss: 'reassuring' },
      ],
      tags: ['particle'],
      level: 'B1',
    },
    {
      id: 'nl-adjective-e',
      title: 'When does the adjective take -e?',
      body: 'Almost always. The exception is an indefinite het-word in the singular, where the adjective stays bare.',
      examples: [
        { form: 'de grote man / het grote huis', gloss: 'definite, so -e' },
        { form: 'een groot huis', gloss: 'indefinite het-word, bare' },
      ],
      tags: ['adj'],
      level: 'A2',
    },
  ],
  ES: [
    {
      id: 'es-ser-estar',
      title: 'ser or estar?',
      body: 'ser is what something is; estar is how it is right now, and where it is.\n\nAs in Portuguese, the adjective changes meaning with the verb, which is the part that catches people out.',
      examples: [
        { form: 'es aburrido', gloss: 'he is boring' },
        { form: 'está aburrido', gloss: 'he is bored' },
        { form: 'está en Madrid', gloss: 'location is always estar' },
      ],
      tags: ['verb'],
      level: 'A2',
    },
    {
      id: 'es-por-para',
      title: 'por or para?',
      body: 'para looks ahead — a destination, a deadline, a purpose, who it is for. por looks behind or through — the cause, the route, the exchange, the duration.',
      examples: [
        { form: 'es para ti', gloss: 'for you — recipient' },
        { form: 'gracias por venir', gloss: 'because you came' },
        { form: 'por la mañana', gloss: 'through the morning' },
      ],
      tags: ['preposition'],
      level: 'B1',
    },
    {
      id: 'es-subjunctive',
      title: 'What triggers the subjunctive?',
      body: 'Not a tense so much as a mood: it turns up when the clause is wanted, doubted, denied or reacted to rather than reported.\n\nThe pattern to spot is a verb of wishing, feeling or doubting, followed by que.',
      examples: [
        { form: 'quiero que vengas', gloss: 'wanting' },
        { form: 'no creo que sea verdad', gloss: 'doubting' },
        { form: 'me alegra que estés aquí', gloss: 'reacting' },
      ],
      tags: ['verb'],
      level: 'B2',
    },
    {
      id: 'es-preterito',
      title: 'pretérito or imperfecto?',
      body: 'The preterite is a thing that happened — it has edges. The imperfect is what was going on, what used to happen, what the scene was like.\n\nMost stories use both: the imperfect paints, the preterite moves.',
      examples: [
        { form: 'llovía cuando salí', gloss: 'was raining / I left' },
        { form: 'de niño jugaba mucho', gloss: 'used to' },
      ],
      tags: ['verb'],
      level: 'B1',
    },
    {
      id: 'es-gender',
      title: 'Gender, and the words that lie about it',
      body: '-o is usually masculine and -a feminine, but a well-known handful break it — and a few take masculine articles for a sound reason rather than a grammatical one.',
      examples: [
        { form: 'el problema, el día, el mapa', gloss: 'masculine despite the -a' },
        { form: 'la mano, la foto', gloss: 'feminine despite the -o' },
        { form: 'el agua fría', gloss: 'feminine, but el to avoid a-a' },
      ],
      tags: ['noun'],
      level: 'A2',
    },
    {
      id: 'es-personal-a',
      title: 'The a before a person',
      body: 'A direct object that is a person takes an a in front of it, with no equivalent in English. Leave it out and the sentence reads as though you are looking for a thing.',
      examples: [
        { form: 'busco a mi hermana', gloss: 'looking for my sister' },
        { form: 'busco mi libro', gloss: 'no a — it is a thing' },
      ],
      tags: ['preposition'],
      level: 'A2',
    },
  ],
};

/** The starter notes as records, one pass, ids already stable in the data. */
export function buildSeedNotes(now: number = Date.now()): Note[] {
  return (Object.keys(SEED_NOTES) as LanguageCode[]).flatMap((language) =>
    SEED_NOTES[language].map((n) => ({ ...n, language, createdAt: now })));
}
