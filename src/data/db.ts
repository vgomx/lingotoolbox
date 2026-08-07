import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card, Deck, Grade, LanguageCode, Prefs, ReviewLogEntry } from './types';
import { asLevel } from './types';
import { buildSeed, WORKSPACES } from './seed';
import { schedule } from './scheduler';

const DB_NAME = 'lingo-toolbox';
const DB_VERSION = 1;
const PREFS_KEY = 'lingo-toolbox:prefs';

interface LingoDB extends DBSchema {
  decks: {
    key: string;
    value: Deck;
    indexes: { 'by-language': LanguageCode };
  };
  cards: {
    key: string;
    value: Card;
    indexes: { 'by-deck': string; 'by-due': number };
  };
  reviews: {
    key: string;
    value: ReviewLogEntry;
    indexes: { 'by-card': string; 'by-time': number };
  };
}

let dbPromise: Promise<IDBPDatabase<LingoDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LingoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const decks = db.createObjectStore('decks', { keyPath: 'id' });
        decks.createIndex('by-language', 'language');

        const cards = db.createObjectStore('cards', { keyPath: 'id' });
        cards.createIndex('by-deck', 'deckId');
        cards.createIndex('by-due', 'due');

        const reviews = db.createObjectStore('reviews', { keyPath: 'id' });
        reviews.createIndex('by-card', 'cardId');
        reviews.createIndex('by-time', 'reviewedAt');
      },
    });
  }
  return dbPromise;
}

/**
 * Moves CEFR levels out of `tags`: into `Card.level` on a card, and off a deck
 * entirely — a deck's span is worked out from its cards now, so a level stored
 * on one is a second answer to the same question that can disagree with them.
 *
 * Not an IndexedDB version upgrade, because the shape of the store has not
 * changed — only the shape of what is in it, and only for records that predate
 * the field. It runs at boot and after a restore, since a backup taken before
 * this can be imported at any point in the future.
 *
 * Idempotent, and it reads before it writes: once no card has a level sitting in
 * its tags there is nothing to do, which is the case on every boot but the one
 * after this ships.
 */
export async function migrateLevels(): Promise<{ cards: number; decks: number }> {
  const db = await getDB();
  const [allCards, allDecks] = await Promise.all([db.getAll('cards'), db.getAll('decks')]);
  const cards = allCards.filter((c) => c.tags.some((t) => asLevel(t)));
  const decks = allDecks.filter((d) => d.tags.some((t) => asLevel(t)));
  if (!cards.length && !decks.length) return { cards: 0, decks: 0 };

  const tx = db.transaction(['cards', 'decks'], 'readwrite');
  await Promise.all([
    ...cards.map((card) => tx.objectStore('cards').put({
      ...card,
      // A card already carrying the field keeps it; the tag is only a fallback.
      level: card.level ?? asLevel(card.tags.find((t) => asLevel(t))),
      tags: card.tags.filter((t) => !asLevel(t)),
    })),
    ...decks.map((deck) => tx.objectStore('decks').put({
      ...deck,
      tags: deck.tags.filter((t) => !asLevel(t)),
    })),
    tx.done,
  ]);
  return { cards: cards.length, decks: decks.length };
}

/**
 * Writes the starter decks the first time the app runs. Safe to call on every boot.
 *
 * Single-flighted: the emptiness check and the write are not atomic, so two
 * concurrent callers would both see an empty database and both seed it. React's
 * StrictMode double-invokes effects in development and does exactly that, which
 * produced a duplicate of every starter card. Sharing one promise makes the
 * second caller await the first instead of racing it.
 */
let seeding: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const db = await getDB();
      if (await db.count('decks')) return;

      const { decks, cards } = buildSeed();
      const tx = db.transaction(['decks', 'cards'], 'readwrite');
      await Promise.all([
        ...decks.map((d) => tx.objectStore('decks').put(d)),
        ...cards.map((c) => tx.objectStore('cards').put(c)),
        tx.done,
      ]);
    })().catch((err) => {
      // Let a failed seed be retried rather than caching the rejection forever.
      seeding = null;
      throw err;
    });
  }
  return seeding;
}

// ── Decks ──────────────────────────────────────────────────────────

export async function listDecks(language: LanguageCode): Promise<Deck[]> {
  const db = await getDB();
  const decks = await db.getAllFromIndex('decks', 'by-language', language);
  return decks.sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name));
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  return (await getDB()).get('decks', id);
}

export async function putDeck(deck: Deck): Promise<void> {
  await (await getDB()).put('decks', deck);
}

/** Removes a deck along with its cards and their review history. */
export async function deleteDeck(id: string): Promise<void> {
  const db = await getDB();
  const cardIds = (await db.getAllFromIndex('cards', 'by-deck', id)).map((c) => c.id);
  const tx = db.transaction(['decks', 'cards', 'reviews'], 'readwrite');
  const reviews = tx.objectStore('reviews');
  await Promise.all([
    tx.objectStore('decks').delete(id),
    ...cardIds.map((cid) => tx.objectStore('cards').delete(cid)),
    ...cardIds.map(async (cid) => {
      for (const r of await reviews.index('by-card').getAll(cid)) await reviews.delete(r.id);
    }),
    tx.done,
  ]);
}

// ── Cards ──────────────────────────────────────────────────────────

export async function listCards(deckId: string): Promise<Card[]> {
  const db = await getDB();
  return (await db.getAllFromIndex('cards', 'by-deck', deckId))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function listCardsForLanguage(language: LanguageCode): Promise<Card[]> {
  const decks = await listDecks(language);
  const perDeck = await Promise.all(decks.map((d) => listCards(d.id)));
  return perDeck.flat();
}

export async function putCard(card: Card): Promise<void> {
  await (await getDB()).put('cards', card);
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDB();
  const reviews = await db.getAllFromIndex('reviews', 'by-card', id);
  const tx = db.transaction(['cards', 'reviews'], 'readwrite');
  await Promise.all([
    tx.objectStore('cards').delete(id),
    ...reviews.map((r) => tx.objectStore('reviews').delete(r.id)),
    tx.done,
  ]);
}

// ── Reviewing ──────────────────────────────────────────────────────

/**
 * Applies a grade: advances the card's scheduler state and appends a log entry.
 * Both writes share one transaction so a card can never advance unrecorded.
 */
export async function gradeCard(card: Card, grade: Grade, now: number = Date.now()): Promise<Card> {
  const next = schedule(card, grade, now);
  const updated: Card = { ...card, ...next };

  const entry: ReviewLogEntry = {
    id: `${card.id}:${now}`,
    cardId: card.id,
    deckId: card.deckId,
    grade,
    reviewedAt: now,
    intervalBefore: card.interval,
    intervalAfter: next.interval,
  };

  const db = await getDB();
  const tx = db.transaction(['cards', 'reviews'], 'readwrite');
  await Promise.all([
    tx.objectStore('cards').put(updated),
    tx.objectStore('reviews').put(entry),
    tx.done,
  ]);

  return updated;
}

export async function reviewsSince(since: number): Promise<ReviewLogEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('reviews', 'by-time', IDBKeyRange.lowerBound(since));
}

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * Consecutive days ending today (or yesterday, if today has no reviews yet) on
 * which at least one card was graded. A gap of a full day ends the streak.
 */
export async function computeStreak(now: number = Date.now()): Promise<number> {
  const db = await getDB();
  const days = new Set((await db.getAll('reviews')).map((r) => dayKey(r.reviewedAt)));
  if (!days.size) return 0;

  const DAY_MS = 24 * 60 * 60 * 1000;
  // Reviewing today isn't required to hold a streak until the day is over, so
  // start counting from today if it's there, otherwise from yesterday.
  let cursor = days.has(dayKey(now)) ? now : now - DAY_MS;
  if (!days.has(dayKey(cursor))) return 0;

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

/**
 * Reviews graded per calendar day, oldest first, ending today.
 *
 * The design's reference home screen shows "this week" as hours spent. We do not
 * track time and inventing it would be a lie, but the review log does record when
 * every grade happened — so the same shape of chart can be drawn from something
 * that actually is true.
 */
export async function reviewsPerDay(days = 7, now: number = Date.now()): Promise<number[]> {
  const db = await getDB();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const from = start.getTime() - (days - 1) * DAY_MS;

  const counts = new Map<string, number>();
  for (const r of await db.getAllFromIndex('reviews', 'by-time', IDBKeyRange.lowerBound(from))) {
    const k = dayKey(r.reviewedAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, i) => counts.get(dayKey(from + i * DAY_MS)) ?? 0);
}

// ── Whole-database access, for backup and restore ──────────────────

/**
 * Everything, across every language workspace.
 *
 * The listing functions above all filter by language because every screen shows
 * one workspace at a time. A backup is the one thing that must not: exporting
 * only the workspace you happen to be looking at would produce a file that looks
 * complete and quietly isn't.
 */
export async function exportAll(): Promise<{ decks: Deck[]; cards: Card[]; reviews: ReviewLogEntry[] }> {
  const db = await getDB();
  const [decks, cards, reviews] = await Promise.all([
    db.getAll('decks'),
    db.getAll('cards'),
    db.getAll('reviews'),
  ]);
  return { decks, cards, reviews };
}

export interface ImportCounts {
  decks: number; cards: number; reviews: number;
  skipped: { decks: number; cards: number; reviews: number };
}

/**
 * Adds records that are not already here, and leaves the ones that are.
 *
 * Never overwrites: an id that already exists is skipped and counted. Restoring
 * into an empty database — the case this exists for, after clearing browser data
 * — puts everything back exactly. Restoring into a database that has moved on
 * cannot silently undo the reviews done since, and merging a file twice does
 * nothing the second time.
 *
 * One transaction across all three stores, so a failure part-way leaves the
 * database as it was rather than half-restored.
 */
export async function importAll(
  data: { decks: Deck[]; cards: Card[]; reviews: ReviewLogEntry[] },
): Promise<ImportCounts> {
  const db = await getDB();
  const existing = await exportAll();
  const has = {
    decks: new Set(existing.decks.map((d) => d.id)),
    cards: new Set(existing.cards.map((c) => c.id)),
    reviews: new Set(existing.reviews.map((r) => r.id)),
  };

  const fresh = {
    decks: data.decks.filter((d) => !has.decks.has(d.id)),
    cards: data.cards.filter((c) => !has.cards.has(c.id)),
    reviews: data.reviews.filter((r) => !has.reviews.has(r.id)),
  };

  const tx = db.transaction(['decks', 'cards', 'reviews'], 'readwrite');
  await Promise.all([
    ...fresh.decks.map((d) => tx.objectStore('decks').put(d)),
    ...fresh.cards.map((c) => tx.objectStore('cards').put(c)),
    ...fresh.reviews.map((r) => tx.objectStore('reviews').put(r)),
    tx.done,
  ]);

  return {
    decks: fresh.decks.length,
    cards: fresh.cards.length,
    reviews: fresh.reviews.length,
    skipped: {
      decks: data.decks.length - fresh.decks.length,
      cards: data.cards.length - fresh.cards.length,
      reviews: data.reviews.length - fresh.reviews.length,
    },
  };
}

// ── Prefs (localStorage — small, synchronous, read on every render) ──

const DEFAULT_PREFS: Prefs = {
  language: 'NL',
  theme: 'dark',
  showShortcuts: true,
  sound: true,
  sessionLimit: 20,
  sidebarCollapsed: false,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const prefs: Prefs = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    // A stored language can outlive the workspace it named — the set changed
    // once already. Falling back beats pointing the whole shell at a workspace
    // that no longer exists.
    if (!WORKSPACES.some((w) => w.code === prefs.language)) prefs.language = DEFAULT_PREFS.language;
    return prefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // A full or blocked localStorage shouldn't take the app down; prefs just
    // fall back to defaults next boot.
  }
}

/** Clears every store — used by the "Reset local data" action in Settings. */
export async function resetAll(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['decks', 'cards', 'reviews'], 'readwrite');
  await Promise.all([
    tx.objectStore('decks').clear(),
    tx.objectStore('cards').clear(),
    tx.objectStore('reviews').clear(),
    tx.done,
  ]);
  localStorage.removeItem(PREFS_KEY);
}
