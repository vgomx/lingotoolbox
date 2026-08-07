export type LanguageCode = 'EN' | 'PT' | 'NL' | 'ES';

export interface Workspace {
  code: LanguageCode;
  /** Written out in full everywhere — a flag is never the only identifier. */
  name: string;
  /**
   * OpenMoji codepoint for the flag, resolved through `illustrations.ts`.
   *
   * Not a character: Windows ships no glyphs for regional indicator pairs, so a
   * native flag emoji renders there as the two letters in a box. A vendored SVG
   * looks the same everywhere, and it also retires the one exception the design
   * system made to "no emoji as UI".
   */
  flagHex: string;
  color: string;
}

export interface Deck {
  id: string;
  language: LanguageCode;
  name: string;
  /** A --tool-* or accent token, drawn as the card's 3px top stripe. */
  accent: string;
  tags: string[];
  createdAt: number;
}

/**
 * One vendored OpenMoji glyph. The catalogue in `openmojiCatalog.ts` is generated
 * from OpenMoji's own metadata by `scripts/build-openmoji.mjs`.
 */
export interface Illustration {
  /** Unicode codepoint(s), e.g. `1F602` — the stable identity, stored on the card. */
  hex: string;
  /** Filename under `public/openmoji/`, e.g. `face-with-tears-of-joy-1F602.svg`. */
  file: string;
  /** OpenMoji's annotation, e.g. "face with tears of joy". Used as alt text. */
  name: string;
  group: string;
  /** Search terms beyond the words already in `name`. */
  keywords: string[];
}

export interface IllustrationGroup {
  id: string;
  label: string;
}

/**
 * CEFR, in ascending order — and the order is the whole point of it being a list
 * rather than a set. "A2 and below" is a comparison, which a tag cannot answer:
 * a `string[]` can say whether it contains 'B1' but not that B1 sits above A2.
 */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

/** Narrows a loose string, for reading data written before the field existed. */
export const asLevel = (v: unknown): CEFRLevel | undefined =>
  (CEFR_LEVELS as readonly string[]).includes(v as string) ? (v as CEFRLevel) : undefined;

/**
 * The span a set of cards covers — "B1" when they agree, "A2–B2" when they do
 * not. Undefined when none of them are graded, which is the honest answer for a
 * deck someone wrote themselves rather than pretending it is A1.
 *
 * A deck does not carry a level of its own: "Everyday phrases" runs from A1 to
 * B2, and a single badge on it would be a guess at an average nobody asked for.
 */
export function levelRange(cards: readonly { level?: CEFRLevel }[]): string | undefined {
  const ranks = cards.map((c) => CEFR_LEVELS.indexOf(c.level as CEFRLevel)).filter((i) => i >= 0);
  if (!ranks.length) return undefined;
  const lo = Math.min(...ranks);
  const hi = Math.max(...ranks);
  return lo === hi ? CEFR_LEVELS[lo] : `${CEFR_LEVELS[lo]}–${CEFR_LEVELS[hi]}`;
}

/** Where a card sits in the scheduler's lifecycle. */
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  phonetic?: string;
  /**
   * Roughly how hard the word is, on the CEFR scale.
   *
   * Its own field rather than a member of `tags`, where it lived until now
   * beside `verb` and `food`. Nothing could tell a level from a topic there, a
   * typo made a new tag rather than an error, and the scale's order — the thing
   * that makes "B1 and above" a question you can ask — was not expressed at all.
   *
   * Optional: a card someone writes themselves does not have to be graded.
   */
  level?: CEFRLevel;
  /**
   * OpenMoji codepoint, e.g. `1F436`. The codepoint rather than the filename, so
   * a renamed asset — or a revised OpenMoji annotation — cannot orphan the card.
   */
  illustration?: string;
  tags: string[];
  createdAt: number;

  // Scheduler state
  state: CardState;
  /** Epoch ms the card next comes up. New cards are due immediately. */
  due: number;
  /** Current spacing in days. 0 while the card is still in minute-scale steps. */
  interval: number;
  /** SM-2 ease factor, floored at 1.3. */
  ease: number;
  reps: number;
  lapses: number;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewLogEntry {
  id: string;
  cardId: string;
  deckId: string;
  grade: Grade;
  reviewedAt: number;
  /** Interval in days before and after this review, for the stats surface. */
  intervalBefore: number;
  intervalAfter: number;
}

export interface Prefs {
  language: LanguageCode;
  theme: 'dark' | 'light';
  showShortcuts: boolean;
  /**
   * UI sound. On by default — the app is opened deliberately rather than
   * stumbled into, and the sounds only ever answer an interaction the reader
   * just made. Settings turns it off and the choice persists.
   */
  sound: boolean;
  /** Cap on how many cards one session will serve. */
  sessionLimit: number;
  /** Deck sidebar hidden to give the content pane the width back. */
  sidebarCollapsed: boolean;
}
