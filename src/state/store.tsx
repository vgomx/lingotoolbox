import * as React from 'react';
import { setSoundEnabled, unlockSound, usePrefersReducedMotion } from 'lingo-ds';
import type { Card, Deck, Direction, Grade, LanguageCode, Note, Prefs, ReviewItem } from '../data/types';
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
  /** Grammar notes for the active workspace. */
  notes: Note[];
  /**
   * The notes worth offering on a card — same language, at least one tag in
   * common. The tags are the join, which is why a note is written in the same
   * words a card is.
   */
  notesFor: (card: Card) => Note[];
  saveNote: (note: Note) => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  cardsInDeck: (deckId: string) => Card[];
  /** The questions a deck owes now — two per card where it is asked both ways. */
  dueInDeck: (deckId: string) => ReviewItem[];
  dueCount: number;
  /** Consecutive days with at least one card graded. */
  streak: number;
  /** Reviews graded per day over the last week, oldest first, ending today. */
  weeklyReviews: number[];

  grade: (card: Card, direction: Direction, grade: Grade) => Promise<Card>;
  /** Takes back the last grade, returning the card it restored, or null. */
  undo: () => Promise<Card | null>;
  /** How many grades can still be taken back. */
  undoDepth: number;
  saveCard: (card: Card) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  saveDeck: (deck: Deck) => Promise<void>;
  removeDeck: (id: string) => Promise<void>;
  reset: () => Promise<void>;
  /** Re-reads the database into the store — used after a restore. */
  reload: () => Promise<void>;
}

/** How many grades back you can go. Deep enough to fix a slip, not a session. */
const UNDO_DEPTH = 10;

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
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [streak, setStreak] = React.useState(0);
  const [weeklyReviews, setWeeklyReviews] = React.useState<number[]>(() => Array(7).fill(0));

  // `tick` exists only to re-run the due derivations as minute-scale cards come
  // back around. Due-ness itself is always measured against Date.now() at call
  // time — reading a snapshot instead meant a card created after the snapshot
  // (every seeded card, and every card the user adds) counted as not-yet-due
  // until the next tick.
  const [switching, setSwitching] = React.useState<string | null>(null);
  /**
   * Cards as they stood before their last few grades, newest last.
   *
   * A snapshot rather than something derived from the review log: the log says
   * what the interval went from and to, which describes a review but cannot
   * reverse one — the ease, the reps and the lapses have all moved too.
   *
   * Held in memory and lost on reload, which is the right lifetime. Undo is for
   * the answer you just mis-pressed, not for editing history a week later.
   */
  const [undoStack, setUndoStack] = React.useState<{ card: Card; entryId: string }[]>([]);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const refresh = React.useCallback(async (language: LanguageCode) => {
    const [nextDecks, nextCards, nextNotes, nextStreak, nextWeek] = await Promise.all([
      db.listDecks(language),
      db.listCardsForLanguage(language),
      db.listNotes(language),
      db.computeStreak(),
      db.reviewsPerDay(),
    ]);
    setDecks(nextDecks);
    setCards(nextCards);
    setNotes(nextNotes);
    setStreak(nextStreak);
    setWeeklyReviews(nextWeek);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await db.ensureSeeded();
      if (cancelled) return;
      // Its own gate, so a reader who already had decks still gets the notes.
      await db.ensureNotesSeeded();
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

  /*
   * Browsers keep an AudioContext suspended until a real gesture, so the first
   * sound of a session would otherwise be swallowed. Unlocking on a pointer or
   * key event means the interaction that asks for a sound is also the one that
   * gets it.
   *
   * On every gesture, not only the first.
   *
   * It used to be `{ once: true }`, on the reasoning that a context only needs
   * unlocking once. That holds for a tab and not for an installed app: iOS
   * parks the audio session whenever the app goes to the background, which is
   * every time the reader leaves it, and an app launched from the home screen
   * is never reloaded — so the one unlock this got was spent on the first
   * session and every one after it was silent. A context can only be revived
   * from inside a gesture, so every gesture has to be willing to do it.
   *
   * Cheap: unlockSound returns immediately when the context is already running.
   * `touchend` alongside `pointerdown` because WebKit has historically been
   * choosier about which events count as the gesture than the spec suggests.
   */
  React.useEffect(() => {
    const unlock = () => unlockSound();
    const opts = { passive: true } as const;
    const events = ['pointerdown', 'touchend', 'keydown'] as const;
    for (const type of events) window.addEventListener(type, unlock, opts);
    // Coming back to the app is the moment the session was most likely lost.
    // Not a gesture, so this cannot revive it on its own — it gets the context
    // rebuilt and ready for the tap that follows.
    document.addEventListener('visibilitychange', unlock);
    return () => {
      for (const type of events) window.removeEventListener(type, unlock);
      document.removeEventListener('visibilitychange', unlock);
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
    const { card: updated, entryId } = await db.gradeCard(card, direction, g);
    setCards((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
    // Capped: this is a safety net for the last few answers, not a history.
    setUndoStack((stack) => [...stack, { card, entryId }].slice(-UNDO_DEPTH));
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

  /**
   * Takes back the most recent grade, and says which card it was.
   *
   * Returns null when there is nothing to take back, so a caller can tell the
   * difference between "undone" and "there was nothing there" without reaching
   * into the stack itself.
   */
  const undo = React.useCallback(async () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return null;
    await db.undoReview(last.entryId, last.card);
    setCards((cs) => cs.map((c) => (c.id === last.card.id ? last.card : c)));
    setUndoStack((stack) => stack.slice(0, -1));
    // The streak and the week are counted from the log, which just lost a row.
    const [nextStreak, nextWeek] = await Promise.all([db.computeStreak(), db.reviewsPerDay()]);
    setStreak(nextStreak);
    setWeeklyReviews(nextWeek);
    return last.card;
  }, [undoStack]);

  const notesFor = React.useCallback(
    (card: Card) => notes.filter((n) => n.tags.some((t) => card.tags.includes(t))),
    [notes],
  );

  const saveNote = React.useCallback(async (note: Note) => {
    await db.putNote(note);
    await refresh(prefs.language);
  }, [prefs.language, refresh]);

  const removeNote = React.useCallback(async (id: string) => {
    await db.deleteNote(id);
    await refresh(prefs.language);
  }, [prefs.language, refresh]);

  const reset = React.useCallback(async () => {
    await db.resetAll();
    await db.ensureSeeded();
    await db.ensureNotesSeeded();
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
    notes,
    notesFor,
    saveNote,
    removeNote,
    cardsInDeck,
    dueInDeck,
    dueCount,
    streak,
    weeklyReviews,
    grade,
    undo,
    undoDepth: undoStack.length,
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
