export type LanguageCode = 'EN' | 'PT' | 'NL' | 'ES';

export interface Workspace {
  code: LanguageCode;
  /** Written out in full everywhere — a flag is never the only identifier. */
  name: string;
  flag: string;
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

/** Where a card sits in the scheduler's lifecycle. */
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  phonetic?: string;
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
