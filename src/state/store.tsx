import * as React from 'react';
import type { Card, Deck, Grade, LanguageCode, Prefs } from '../data/types';
import * as db from '../data/db';
import { isDue } from '../data/scheduler';
import { WORKSPACES } from '../data/seed';

interface StoreValue {
  ready: boolean;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;

  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  workspace: (typeof WORKSPACES)[number];

  /** Decks in the active language workspace. */
  decks: Deck[];
  /** Every card across those decks. */
  cards: Card[];

  cardsInDeck: (deckId: string) => Card[];
  dueInDeck: (deckId: string) => Card[];
  dueCount: number;
  /** Consecutive days with at least one card graded. */
  streak: number;
  /** Reviews graded per day over the last week, oldest first, ending today. */
  weeklyReviews: number[];

  grade: (card: Card, grade: Grade) => Promise<Card>;
  saveCard: (card: Card) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  saveDeck: (deck: Deck) => Promise<void>;
  removeDeck: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}

const StoreContext = React.createContext<StoreValue | null>(null);

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
      await refresh(prefs.language);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
    // Re-runs when the workspace changes so the deck list follows the language.
  }, [prefs.language, refresh]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
  }, [prefs.theme]);

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

  const dueInDeck = React.useCallback(
    (deckId: string) => cards.filter((c) => c.deckId === deckId && isDue(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces a re-derive
    [cards, tick],
  );

  const dueCount = React.useMemo(
    () => cards.filter((c) => isDue(c)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces a re-derive
    [cards, tick],
  );

  const grade = React.useCallback(async (card: Card, g: Grade) => {
    const updated = await db.gradeCard(card, g);
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

  const reset = React.useCallback(async () => {
    await db.resetAll();
    await db.ensureSeeded();
    await refresh(prefs.language);
  }, [prefs.language, refresh]);

  const workspace = WORKSPACES.find((w) => w.code === prefs.language) ?? WORKSPACES[0];

  const value: StoreValue = {
    ready,
    prefs,
    setPrefs,
    language: prefs.language,
    setLanguage: (code) => setPrefs({ language: code }),
    workspace,
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
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
