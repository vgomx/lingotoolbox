export type LanguageCode = 'ES' | 'JA' | 'TR';

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

/** Where a card sits in the scheduler's lifecycle. */
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  phonetic?: string;
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
  /** Cap on how many cards one session will serve. */
  sessionLimit: number;
  /** Deck sidebar hidden to give the content pane the width back. */
  sidebarCollapsed: boolean;
}
