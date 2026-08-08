import * as React from 'react';
import { setSoundEnabled, unlockSound, usePrefersReducedMotion } from 'lingo-ds';
import type { Card, Deck, Direction, Grade, LanguageCode, Prefs, ReviewItem } from '../data/types';
import * as db from '../data/db';
import { dueDirections } from '../data/scheduler';
import { WORKSPACES } from '../data/seed';

interface StoreValue {
  ready: boolean;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;

  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  workspace: (typeof WORKSPACES)[number];
  /**
   * The workspace being switched to, while the switch is being shown — the name,
   * so the overlay can say it. Null the rest of the time.
   *
   * Held here rather than in the switcher because it belongs to the state
   * change, not to the control: the recovery on a deck in another workspace
   * changes language too, and should look the same doing it.
   */
  switching: string | null;

  /** Decks in the active language workspace. */
  decks: Deck[];
  /** Every card across those decks. */
  cards: Card[];

  cardsInDeck: (deckId: string) => Card[];
  /** The questions a deck owes now — two per card where it is asked both ways. */
  dueInDeck: (deckId: string) => ReviewItem[];
  dueCount: number;
  /** Consecutive days with at least one card graded. */
  streak: number;
  /** Reviews graded per day over the last week, oldest first, ending today. */
  weeklyReviews: number[];

  grade: (card: Card, direction: Direction, grade: Grade) => Promise<Card>;
  saveCard: (card: Card) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  saveDeck: (deck: Deck) => Promise<void>;
  removeDeck: (id: string) => Promise<void>;
  reset: () => Promise<void>;
  /** Re-reads the database into the store — used after a restore. */
  reload: () => Promise<void>;
}

const StoreContext = React.createContext<StoreValue | null>(null);

/**
 * How long the workspace switch is shown for.
 *
 * Not how long it takes. Every deck and card is already in this browser, so the
 * read behind a switch is a few milliseconds and the app could simply cut to the
 * new workspace. It reads as a glitch when it does — the whole page changes
 * underneath you with nothing to say it was meant. This is a beat put there on
 * purpose to name what happened, kept to about the length of the page
 * transitions around it.
 */
const SWITCH_MS = 520;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [prefs, setPrefsState] = React.useState<Prefs>(() => db.loadPrefs());
  const [decks, setDecks] = React.useState<Deck[]>([]);
  const [cards, setCards] = React.useState<Card[]>([]);
  const [streak, setStreak] = React.useState(0);
  const [weeklyReviews, setWeeklyReviews] = React.useState<number[]>(() => Array(7).fill(0));

  // `tick` exists only to re-run the due derivations as minute-scale cards come
  // back around. Due-ness itself is always measured against Date.now() at call
  // time — reading a snapshot instead meant a card created after the snapshot
  // (every seeded card, and every card the user adds) counted as not-yet-due
  // until the next tick.
  const [switching, setSwitching] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const refresh = React.useCallback(async (language: LanguageCode) => {
    const [nextDecks, nextCards, nextStreak, nextWeek] = await Promise.all([
      db.listDecks(language),
      db.listCardsForLanguage(language),
      db.computeStreak(),
      db.reviewsPerDay(),
    ]);
    setDecks(nextDecks);
    setCards(nextCards);
    setStreak(nextStreak);
    setWeeklyReviews(nextWeek);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await db.ensureSeeded();
      if (cancelled) return;
      // Before the first read, so nothing renders a level that is still a tag.
      await db.migrateLevels();
      if (cancelled) return;
      await refresh(prefs.language);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
    // Re-runs when the workspace changes so the deck list follows the language.
  }, [prefs.language, refresh]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
  }, [prefs.theme]);

  // The sound module holds the on/off flag outside React, so that playSound can
  // be called from anywhere without threading the preference through. This is
  // the one place that keeps the two in step.
  React.useEffect(() => {
    setSoundEnabled(prefs.sound);
  }, [prefs.sound]);

  // Browsers keep an AudioContext suspended until a real gesture, so the first
  // sound of a session would otherwise be swallowed. Unlocking on the first
  // pointer or key event means the interaction that asks for a sound is also the
  // one that gets it.
  React.useEffect(() => {
    const unlock = () => unlockSound();
    const opts = { once: true, passive: true } as const;
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const setPrefs = React.useCallback((patch: Partial<Prefs>) => {
    setPrefsState((current) => {
      const next = { ...current, ...patch };
      db.savePrefs(next);
      return next;
    });
  }, []);

  const cardsInDeck = React.useCallback(
    (deckId: string) => cards.filter((c) => c.deckId === deckId),
    [cards],
  );

  /**
   * Everything owed in a deck, as questions rather than cards.
   *
   * A card asked both ways owes two, and each falls due on its own schedule — so
   * a deck of eight words can owe anything from nothing to sixteen. Callers that
   * only want a number still read `.length`; the review screen wants the items.
   */
  const dueInDeck = React.useCallback(
    (deckId: string): ReviewItem[] => {
      const now = Date.now();
      return cards
        .filter((c) => c.deckId === deckId)
        .flatMap((card) => dueDirections(card, now).map((direction) => ({ card, direction })));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces a re-derive
    [cards, tick],
  );

  const dueCount = React.useMemo(
    () => {
      const now = Date.now();
      return cards.reduce((n, card) => n + dueDirections(card, now).length, 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces a re-derive
    [cards, tick],
  );

  const grade = React.useCallback(async (card: Card, direction: Direction, g: Grade) => {
    const updated = await db.gradeCard(card, direction, g);
    setCards((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
    const [nextStreak, nextWeek] = await Promise.all([db.computeStreak(), db.reviewsPerDay()]);
    setStreak(nextStreak);
    setWeeklyReviews(nextWeek);
    return updated;
  }, []);

  const saveCard = React.useCallback(async (card: Card) => {
    await db.putCard(card);
    setCards((cs) => (cs.some((c) => c.id === card.id)
      ? cs.map((c) => (c.id === card.id ? card : c))
      : [...cs, card]));
  }, []);

  const removeCard = React.useCallback(async (id: string) => {
    await db.deleteCard(id);
    setCards((cs) => cs.filter((c) => c.id !== id));
  }, []);

  const saveDeck = React.useCallback(async (deck: Deck) => {
    await db.putDeck(deck);
    setDecks((ds) => (ds.some((d) => d.id === deck.id)
      ? ds.map((d) => (d.id === deck.id ? deck : d))
      : [...ds, deck]));
  }, []);

  const removeDeck = React.useCallback(async (id: string) => {
    await db.deleteDeck(id);
    setDecks((ds) => ds.filter((d) => d.id !== id));
    setCards((cs) => cs.filter((c) => c.deckId !== id));
  }, []);

  const reload = React.useCallback(async () => {
    await db.migrateLevels();
    await refresh(prefs.language);
  }, [prefs.language, refresh]);

  const reset = React.useCallback(async () => {
    await db.resetAll();
    await db.ensureSeeded();
    await refresh(prefs.language);
  }, [prefs.language, refresh]);

  const workspace = WORKSPACES.find((w) => w.code === prefs.language) ?? WORKSPACES[0];

  const reducedMotion = usePrefersReducedMotion();
  const switchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (switchTimer.current) clearTimeout(switchTimer.current); }, []);

  const setLanguage = React.useCallback((code: LanguageCode) => {
    // Switching to the workspace you are already in is not a switch, and should
    // not put a card over the screen to say so.
    if (code === prefs.language) return;
    setPrefs({ language: code });
    // Someone who has asked for less motion has asked not to be shown a
    // transition, and this one is entirely a transition — so it is skipped
    // rather than played still. The switch itself is unaffected.
    if (reducedMotion) return;
    setSwitching(WORKSPACES.find((w) => w.code === code)?.name ?? null);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setSwitching(null), SWITCH_MS);
  }, [prefs.language, setPrefs, reducedMotion]);

  const value: StoreValue = {
    ready,
    prefs,
    setPrefs,
    language: prefs.language,
    setLanguage,
    workspace,
    switching,
    decks,
    cards,
    cardsInDeck,
    dueInDeck,
    dueCount,
    streak,
    weeklyReviews,
    grade,
    saveCard,
    removeCard,
    saveDeck,
    removeDeck,
    reset,
    reload,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
