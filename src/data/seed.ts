import type { CEFRLevel, Card, Deck, LanguageCode, Workspace } from './types';
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
  { id: 'cards', label: 'Flashcards', short: 'Cards', icon: 'layers', path: 'cards', accent: 'var(--tool-flashcards)', released: true, blurb: 'Spaced repetition that schedules itself.' },
  { id: 'etymology', label: 'Etymology Explorer', short: 'Roots', icon: 'git-branch', path: 'etymology', accent: 'var(--tool-etymology)', released: false, blurb: 'Trace a word back to its root.' },
  { id: 'conjugation', label: 'Conjugation Drill', short: 'Verbs', icon: 'spell-check', path: 'conjugation', accent: 'var(--tool-conjugation)', released: false, blurb: 'Drill the verb forms you keep missing.' },
  { id: 'phrasebook', label: 'Phrasebook', short: 'Phrases', icon: 'message-square-quote', path: 'phrasebook', accent: 'var(--tool-phrasebook)', released: false, blurb: 'Keep whole phrases, not just single words.' },
  { id: 'grammar', label: 'Grammar Notes', short: 'Grammar', icon: 'scroll-text', path: 'grammar', accent: 'var(--tool-grammar)', released: false, blurb: 'Pull up a short explanation mid-review.' },
] as const;

export type ToolId = (typeof TOOLS)[number]['id'];

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
  tags: string[];
}

interface SeedDeck {
  id: string;
  name: string;
  accent: string;
  tags: string[];
  cards: SeedCard[];
}

/**
 * A starter workspace so the app is never empty on first open. Everything here is
 * ordinary vocabulary; the user can delete the decks and add their own.
 */
const SEED: Record<LanguageCode, SeedDeck[]> = {
  EN: [
    {
      id: 'en-phrasal',
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
      ],
    },
    {
      id: 'en-precise',
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
      ],
    },
    {
      id: 'en-directions',
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
      ],
    },
    {
      id: 'en-work',
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
      ],
    },
    // Abstract by nature, so no illustrations — see the note on SeedCard.
    {
      id: 'en-linking',
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
        { front: 'saudade', back: 'the presence of something absent', phonetic: '/sɐwˈdaðɨ/', illustration: '1F97A', level: 'B1', tags: ['noun'] },
        { front: 'pois é', back: 'yeah, exactly — agreeing with a sigh', level: 'A2', tags: ['phrase'] },
        { front: 'dar uma volta', back: 'to go for a wander', illustration: '1F6B6', level: 'A2', tags: ['phrase'] },
        { front: 'está tudo bem', back: 'everything is fine', illustration: '1F44D', level: 'A1', tags: ['phrase'] },
        { front: 'se calhar', back: 'maybe, perhaps', illustration: '1F914', level: 'B1', tags: ['phrase'] },
        { front: 'desenrascar', back: 'to get yourself out of a fix improvised', phonetic: '/dɨzẽʁɐʃˈkaɾ/', illustration: '1F527', level: 'B2', tags: ['verb'] },
      ],
    },
    {
      id: 'pt-false-friends',
      name: 'False friends',
      accent: 'var(--coral-500)',
      tags: ['traps'],
      cards: [
        { front: 'puxar', back: 'to pull — not to push', phonetic: '/puˈʃaɾ/', illustration: '1F6AA', level: 'A2', tags: ['verb'] },
        { front: 'constipado', back: 'having a cold — not constipated', illustration: '1F927', level: 'B1', tags: ['adj'] },
        { front: 'esquisito', back: 'strange — not exquisite', phonetic: '/ɨʃkiˈzitu/', illustration: '1F928', level: 'B1', tags: ['adj'] },
        { front: 'livraria', back: 'bookshop — a library is a biblioteca', phonetic: '/livɾɐˈɾiɐ/', illustration: '1F4DA', level: 'A2', tags: ['noun'] },
        { front: 'pasta', back: 'folder or briefcase — the food is massa', illustration: '1F45C', level: 'A2', tags: ['noun'] },
        { front: 'êxito', back: 'success — not an exit', illustration: '1F3C6', level: 'B1', tags: ['noun'] },
      ],
    },
    {
      id: 'pt-cafe',
      name: 'At the café',
      accent: 'var(--coral-500)',
      tags: ['food'],
      cards: [
        { front: 'uma bica', back: 'an espresso — what you ask for in Lisbon', illustration: '2615', level: 'A2', tags: ['noun'] },
        { front: 'um galão', back: 'coffee with milk, served in a tall glass', illustration: '1F95B', level: 'A2', tags: ['noun'] },
        { front: 'a ementa', back: 'the menu', level: 'A1', tags: ['noun'] },
        { front: 'um pastel de nata', back: 'a custard tart, best eaten warm', illustration: '1F9C1', level: 'A1', tags: ['noun'] },
        { front: 'uma sandes', back: 'a sandwich', illustration: '1F96A', level: 'A1', tags: ['noun'] },
        { front: 'um copo de água', back: 'a glass of water', illustration: '1F4A7', level: 'A1', tags: ['phrase'] },
        { front: 'a conta, por favor', back: 'the bill, please', level: 'A1', tags: ['phrase'] },
        { front: 'está bom assim', back: 'that is enough — said to stop someone pouring', level: 'B1', tags: ['phrase'] },
      ],
    },
    {
      id: 'pt-verbs',
      name: 'Everyday verbs',
      accent: 'var(--cyan-500)',
      tags: ['verbs'],
      cards: [
        { front: 'levar', back: 'to take something with you when you go', level: 'A1', tags: ['verb'] },
        { front: 'trazer', back: 'to bring something with you when you come', level: 'A1', tags: ['verb'] },
        { front: 'ter de', back: 'to have to', level: 'A2', tags: ['verb'] },
        { front: 'ir buscar', back: 'to go and fetch — one idea, two verbs', level: 'A2', tags: ['verb'] },
        { front: 'ficar', back: 'to stay, and also to become', level: 'A2', tags: ['verb'] },
        { front: 'apetecer', back: 'to feel like doing something', level: 'B1', tags: ['verb'] },
        { front: 'calhar', back: 'to happen to, by chance', level: 'B1', tags: ['verb'] },
        { front: 'dar-se bem', back: 'to get on well with someone', level: 'B1', tags: ['verb'] },
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
        { front: 'fiquei surpreendido', back: 'I was surprised', illustration: '1FAE2', level: 'A2', tags: ['phrase'] },
        { front: 'estou farto', back: 'I have had enough of it', illustration: '1F612', level: 'B1', tags: ['phrase'] },
        { front: 'que chatice', back: 'what a nuisance', illustration: '1F644', level: 'B1', tags: ['phrase'] },
        { front: 'estou à vontade', back: 'I am at ease here', level: 'B1', tags: ['phrase'] },
        { front: 'estou aflito', back: 'I am anxious — or in a tight spot', level: 'B1', tags: ['phrase'] },
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
      ],
    },
    {
      id: 'nl-separable',
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
      ],
    },
    {
      id: 'nl-market',
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
      ],
    },
    {
      id: 'nl-work',
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
      ],
    },
  ],
  ES: [
    {
      id: 'es-kitchen',
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
      ],
    },
    {
      id: 'es-verbs',
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
      ],
    },
    {
      id: 'es-travel',
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
      ],
    },
    {
      id: 'es-linking',
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
