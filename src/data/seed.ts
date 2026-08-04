import type { Card, Deck, LanguageCode, Workspace } from './types';
import { START_EASE } from './scheduler';

export const WORKSPACES: Workspace[] = [
  { code: 'ES', name: 'Spanish', flag: '🇪🇸', color: 'var(--coral-500)' },
  { code: 'JA', name: 'Japanese', flag: '🇯🇵', color: 'var(--cyan-500)' },
  { code: 'TR', name: 'Turkish', flag: '🇹🇷', color: 'var(--mint-500)' },
];

export const TOOLS = [
  { id: 'home', label: 'Home', short: 'Home', icon: 'house', path: 'home' },
  { id: 'cards', label: 'Flashcards', short: 'Cards', icon: 'layers', path: 'cards', accent: 'var(--tool-flashcards)' },
  { id: 'etymology', label: 'Etymology Explorer', short: 'Roots', icon: 'git-branch', path: 'etymology', accent: 'var(--tool-etymology)' },
  { id: 'conjugation', label: 'Conjugation Drill', short: 'Verbs', icon: 'spell-check', path: 'conjugation', accent: 'var(--tool-conjugation)' },
  { id: 'phrasebook', label: 'Phrasebook', short: 'Phrases', icon: 'message-square-quote', path: 'phrasebook', accent: 'var(--tool-phrasebook)' },
  { id: 'grammar', label: 'Grammar Notes', short: 'Grammar', icon: 'scroll-text', path: 'grammar', accent: 'var(--tool-grammar)' },
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
  JA: [
    {
      id: 'ja-daily',
      name: 'Everyday phrases',
      accent: 'var(--cyan-500)',
      tags: ['phrases', 'N5'],
      cards: [
        { front: 'よろしく', back: 'please treat me well — said on meeting', phonetic: 'yoroshiku', tags: ['phrase', 'N5'] },
        { front: 'お疲れさま', back: 'thanks for your work', phonetic: 'otsukaresama', tags: ['phrase', 'N4'] },
        { front: '久しぶり', back: 'long time no see', phonetic: 'hisashiburi', tags: ['phrase', 'N4'] },
        { front: '仕方がない', back: 'it can’t be helped', phonetic: 'shikata ga nai', tags: ['phrase', 'N3'] },
        { front: 'いただきます', back: 'said before eating', phonetic: 'itadakimasu', tags: ['phrase', 'N5'] },
      ],
    },
    {
      id: 'ja-counters',
      name: 'Counters',
      accent: 'var(--amber-500)',
      tags: ['grammar', 'N4'],
      cards: [
        { front: '本', back: 'counter for long thin things', phonetic: 'hon', tags: ['counter', 'N4'] },
        { front: '枚', back: 'counter for flat things', phonetic: 'mai', tags: ['counter', 'N4'] },
        { front: '匹', back: 'counter for small animals', phonetic: 'hiki', tags: ['counter', 'N4'] },
        { front: '台', back: 'counter for machines', phonetic: 'dai', tags: ['counter', 'N4'] },
      ],
    },
  ],
  TR: [
    {
      id: 'tr-market',
      name: 'At the market',
      accent: 'var(--mint-500)',
      tags: ['shopping', 'A2'],
      cards: [
        { front: 'pazar', back: 'the market', phonetic: '/paˈzaɾ/', tags: ['noun', 'A1'] },
        { front: 'kaç para', back: 'how much', phonetic: '/katʃ paˈɾa/', tags: ['phrase', 'A1'] },
        { front: 'taze', back: 'fresh', phonetic: '/taˈze/', tags: ['adj', 'A1'] },
        { front: 'yarım kilo', back: 'half a kilo', phonetic: '/jaˈɾɯm ˈki.lo/', tags: ['phrase', 'A2'] },
        { front: 'poşet', back: 'carrier bag', phonetic: '/poˈʃet/', tags: ['noun', 'A2'] },
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
