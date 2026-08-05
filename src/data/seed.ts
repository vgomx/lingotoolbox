import type { Card, Deck, LanguageCode, Workspace } from './types';
import { START_EASE } from './scheduler';

export const WORKSPACES: Workspace[] = [
  { code: 'EN', name: 'English', flag: '🇬🇧', color: 'var(--cyan-500)' },
  { code: 'PT', name: 'Portuguese', flag: '🇵🇹', color: 'var(--mint-500)' },
  { code: 'NL', name: 'Dutch', flag: '🇳🇱', color: 'var(--amber-500)' },
  { code: 'ES', name: 'Spanish', flag: '🇪🇸', color: 'var(--coral-500)' },
];

/** `released: false` marks a tool that is designed but not built — the rail
 *  flags those with a "Soon" badge. Flip the flag when a tool ships. */
export const TOOLS = [
  { id: 'home', label: 'Home', short: 'Home', icon: 'house', path: 'home', accent: 'var(--brand)', released: true },
  { id: 'cards', label: 'Flashcards', short: 'Cards', icon: 'layers', path: 'cards', accent: 'var(--tool-flashcards)', released: true },
  { id: 'etymology', label: 'Etymology Explorer', short: 'Roots', icon: 'git-branch', path: 'etymology', accent: 'var(--tool-etymology)', released: false },
  { id: 'conjugation', label: 'Conjugation Drill', short: 'Verbs', icon: 'spell-check', path: 'conjugation', accent: 'var(--tool-conjugation)', released: false },
  { id: 'phrasebook', label: 'Phrasebook', short: 'Phrases', icon: 'message-square-quote', path: 'phrasebook', accent: 'var(--tool-phrasebook)', released: false },
  { id: 'grammar', label: 'Grammar Notes', short: 'Grammar', icon: 'scroll-text', path: 'grammar', accent: 'var(--tool-grammar)', released: false },
] as const;

export type ToolId = (typeof TOOLS)[number]['id'];

interface SeedCard {
  front: string;
  back: string;
  phonetic?: string;
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
      tags: ['verbs', 'B1'],
      cards: [
        { front: 'put off', back: 'to postpone — or to make someone lose interest', tags: ['verb', 'B1'] },
        { front: 'bring up', back: 'to mention a subject, or to raise a child', tags: ['verb', 'B1'] },
        { front: 'get by', back: 'to manage with just enough', tags: ['verb', 'B2'] },
        { front: 'run into', back: 'to meet by chance', tags: ['verb', 'B1'] },
        { front: 'look after', back: 'to take care of', tags: ['verb', 'A2'] },
        { front: 'call off', back: 'to cancel something already arranged', tags: ['verb', 'B1'] },
        { front: 'take on', back: 'to accept work or responsibility', tags: ['verb', 'B2'] },
        { front: 'come across', back: 'to find by chance, or to give an impression', tags: ['verb', 'B2'] },
      ],
    },
    {
      id: 'en-precise',
      name: 'Words worth knowing',
      accent: 'var(--cyan-500)',
      tags: ['vocabulary', 'C1'],
      cards: [
        { front: 'ubiquitous', back: 'found everywhere at once', phonetic: '/juːˈbɪkwɪtəs/', tags: ['adj', 'C1'] },
        { front: 'meticulous', back: 'careful about every small detail', phonetic: '/məˈtɪkjələs/', tags: ['adj', 'B2'] },
        { front: 'candid', back: 'honest, even when it is awkward', phonetic: '/ˈkændɪd/', tags: ['adj', 'B2'] },
        { front: 'resilient', back: 'able to recover quickly', phonetic: '/rɪˈzɪliənt/', tags: ['adj', 'B2'] },
        { front: 'ambiguous', back: 'open to more than one reading', phonetic: '/æmˈbɪɡjuəs/', tags: ['adj', 'B2'] },
        { front: 'pragmatic', back: 'guided by what works rather than by theory', phonetic: '/præɡˈmætɪk/', tags: ['adj', 'B2'] },
        { front: 'succinct', back: 'said in few words', phonetic: '/səkˈsɪŋkt/', tags: ['adj', 'C1'] },
      ],
    },
    {
      id: 'en-idioms',
      name: 'Everyday idioms',
      accent: 'var(--pink-500)',
      tags: ['idiom', 'B2'],
      cards: [
        { front: 'hit the nail on the head', back: 'to be exactly right', tags: ['idiom', 'B2'] },
        { front: 'under the weather', back: 'slightly unwell', tags: ['idiom', 'B1'] },
        { front: 'the ball is in your court', back: 'it is your turn to act', tags: ['idiom', 'B2'] },
        { front: 'cut corners', back: 'to do something cheaply or carelessly', tags: ['idiom', 'B2'] },
        { front: 'on the fence', back: 'undecided between two options', tags: ['idiom', 'B2'] },
        { front: 'a blessing in disguise', back: 'something bad that turns out well', tags: ['idiom', 'B2'] },
      ],
    },
  ],
  PT: [
    {
      id: 'pt-everyday',
      name: 'Everyday phrases',
      accent: 'var(--tool-flashcards)',
      tags: ['phrases', 'A2'],
      cards: [
        { front: 'saudade', back: 'the presence of something absent', phonetic: '/sɐwˈdaðɨ/', tags: ['noun', 'B1'] },
        { front: 'pois é', back: 'yeah, exactly — agreeing with a sigh', tags: ['phrase', 'A2'] },
        { front: 'dar uma volta', back: 'to go for a wander', tags: ['phrase', 'A2'] },
        { front: 'está tudo bem', back: 'everything is fine', tags: ['phrase', 'A1'] },
        { front: 'se calhar', back: 'maybe, perhaps', tags: ['phrase', 'B1'] },
        { front: 'desenrascar', back: 'to get yourself out of a fix improvised', phonetic: '/dɨzẽʁɐʃˈkaɾ/', tags: ['verb', 'B2'] },
      ],
    },
    {
      id: 'pt-false-friends',
      name: 'False friends',
      accent: 'var(--coral-500)',
      tags: ['traps', 'B1'],
      cards: [
        { front: 'puxar', back: 'to pull — not to push', phonetic: '/puˈʃaɾ/', tags: ['verb', 'A2'] },
        { front: 'constipado', back: 'having a cold — not constipated', tags: ['adj', 'B1'] },
        { front: 'esquisito', back: 'strange — not exquisite', phonetic: '/ɨʃkiˈzitu/', tags: ['adj', 'B1'] },
        { front: 'livraria', back: 'bookshop — a library is a biblioteca', phonetic: '/livɾɐˈɾiɐ/', tags: ['noun', 'A2'] },
        { front: 'pasta', back: 'folder or briefcase — the food is massa', tags: ['noun', 'A2'] },
        { front: 'êxito', back: 'success — not an exit', tags: ['noun', 'B1'] },
      ],
    },
  ],
  NL: [
    {
      id: 'nl-everyday',
      name: 'Everyday phrases',
      accent: 'var(--tool-flashcards)',
      tags: ['phrases', 'A2'],
      cards: [
        { front: 'gezellig', back: 'warm, companionable, good to be in', phonetic: '/ɣəˈzɛləx/', tags: ['adj', 'A2'] },
        { front: 'lekker', back: 'tasty — also just pleasant, for almost anything', phonetic: '/ˈlɛkər/', tags: ['adj', 'A1'] },
        { front: 'hoe gaat het', back: 'how are you', tags: ['phrase', 'A1'] },
        { front: 'alsjeblieft', back: 'please — and also here you go', phonetic: '/ɑlsjəˈblift/', tags: ['phrase', 'A1'] },
        { front: 'doe maar normaal', back: 'just act normal — a whole national attitude', tags: ['phrase', 'B1'] },
        { front: 'afspraak', back: 'an appointment or an agreement', phonetic: '/ˈɑfspraːk/', tags: ['noun', 'A2'] },
      ],
    },
    {
      id: 'nl-separable',
      name: 'Separable verbs',
      accent: 'var(--amber-500)',
      tags: ['verbs', 'A2'],
      cards: [
        { front: 'opstaan', back: 'to get up — ik sta op', phonetic: '/ˈɔpstaːn/', tags: ['verb', 'A2'] },
        { front: 'meenemen', back: 'to bring along — ik neem mee', phonetic: '/ˈmeːneːmə(n)/', tags: ['verb', 'A2'] },
        { front: 'aankomen', back: 'to arrive — ik kom aan', phonetic: '/ˈaːnkoːmə(n)/', tags: ['verb', 'A2'] },
        { front: 'uitgaan', back: 'to go out — ik ga uit', phonetic: '/ˈœytɣaːn/', tags: ['verb', 'A2'] },
        { front: 'afspreken', back: 'to arrange to meet — ik spreek af', phonetic: '/ˈɑfspreːkə(n)/', tags: ['verb', 'B1'] },
        { front: 'meevallen', back: 'to turn out better than feared', tags: ['verb', 'B1'] },
      ],
    },
  ],
  ES: [
    {
      id: 'es-kitchen',
      name: 'Kitchen Spanish',
      accent: 'var(--tool-flashcards)',
      tags: ['food', 'A2'],
      cards: [
        { front: 'sobremesa', back: 'the long talk after a meal', phonetic: '/so.bɾeˈme.sa/', tags: ['noun', 'B1'] },
        { front: 'la sartén', back: 'the frying pan', phonetic: '/la saɾˈten/', tags: ['noun', 'A1'] },
        { front: 'hervir', back: 'to boil', phonetic: '/eɾˈβiɾ/', tags: ['verb', 'A2'] },
        { front: 'el fregadero', back: 'the kitchen sink', phonetic: '/el fɾe.ɣaˈðe.ɾo/', tags: ['noun', 'A2'] },
        { front: 'picar', back: 'to chop, or to snack', phonetic: '/piˈkaɾ/', tags: ['verb', 'A2'] },
        { front: 'a fuego lento', back: 'on a low heat', phonetic: '/a ˈfwe.ɣo ˈlen.to/', tags: ['phrase', 'B1'] },
        { front: 'el aliño', back: 'the dressing', phonetic: '/el aˈli.ɲo/', tags: ['noun', 'B1'] },
        { front: 'soso', back: 'bland, under-salted', phonetic: '/ˈso.so/', tags: ['adj', 'B1'] },
      ],
    },
    {
      id: 'es-idioms',
      name: 'Idioms that lie',
      accent: 'var(--coral-500)',
      tags: ['idiom', 'B2'],
      cards: [
        { front: 'estar en las nubes', back: 'to be daydreaming', phonetic: '/esˈtaɾ en las ˈnu.βes/', tags: ['idiom', 'B2'] },
        { front: 'ser pan comido', back: 'to be very easy', phonetic: '/seɾ pan koˈmi.ðo/', tags: ['idiom', 'B2'] },
        { front: 'tomar el pelo', back: 'to pull someone’s leg', phonetic: '/toˈmaɾ el ˈpe.lo/', tags: ['idiom', 'B2'] },
        { front: 'no tener pelos en la lengua', back: 'to speak bluntly', phonetic: '/no teˈneɾ ˈpe.los/', tags: ['idiom', 'C1'] },
        { front: 'echar de menos', back: 'to miss someone', phonetic: '/eˈtʃaɾ de ˈme.nos/', tags: ['idiom', 'B1'] },
        { front: 'dar en el clavo', back: 'to hit the nail on the head', phonetic: '/daɾ en el ˈkla.βo/', tags: ['idiom', 'B2'] },
      ],
    },
    {
      id: 'es-verbs',
      name: 'Irregular verbs',
      accent: 'var(--pink-500)',
      tags: ['verbs', 'B1'],
      cards: [
        { front: 'caber', back: 'to fit — yo quepo', phonetic: '/kaˈβeɾ/', tags: ['verb', 'B1'] },
        { front: 'oír', back: 'to hear — yo oigo', phonetic: '/oˈiɾ/', tags: ['verb', 'A2'] },
        { front: 'traer', back: 'to bring — yo traigo', phonetic: '/tɾaˈeɾ/', tags: ['verb', 'A2'] },
        { front: 'saber', back: 'to know — yo sé', phonetic: '/saˈβeɾ/', tags: ['verb', 'A1'] },
        { front: 'poder', back: 'to be able — yo puedo', phonetic: '/poˈðeɾ/', tags: ['verb', 'A1'] },
        { front: 'huir', back: 'to flee — yo huyo', phonetic: '/wiɾ/', tags: ['verb', 'B1'] },
        { front: 'valer', back: 'to be worth — yo valgo', phonetic: '/baˈleɾ/', tags: ['verb', 'B1'] },
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
          tags: c.tags,
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
