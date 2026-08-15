import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card, Deck, Direction, Grade, LanguageCode, Note, PracticeDay, PracticeTool, Prefs, StreakExtension, ReviewLogEntry } from './types';
import { asLevel } from './types';
import { buildSeed, buildSeedNotes, WORKSPACES } from './seed';
import { schedule, scheduleOf, withSchedule } from './scheduler';

const DB_NAME = 'lingo-toolbox';
/**
 * 2 added the notes store, 3 the practice log, 4 the repaired days, 5 the streak
 * extensions that replaced them. The upgrade below is written to
 * run from whatever version a reader is on rather than assuming an empty
 * database, which is what version 1's did — it created all three stores
 * unconditionally, which is only correct the first time anyone opens the app.
 */
const DB_VERSION = 5;
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
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-language': LanguageCode };
  };
  practice: {
    key: string;
    value: PracticeDay;
    indexes: { 'by-day': string };
  };
  /**
   * Version 4's repaired days. Nothing writes here any more; it is read once by
   * migrateRepairs and emptied. Kept rather than deleted in the upgrade so the
   * migration can be an ordinary idempotent function at boot, like
   * migrateLevels, instead of async work inside a versionchange transaction.
   */
  repairs: {
    key: string;
    value: { day: string; at: number; cost: number };
  };
  /** Held while `usedOn` is absent, spent once it is set. */
  extensions: {
    key: string;
    value: StreakExtension;
  };
}

let dbPromise: Promise<IDBPDatabase<LingoDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LingoDB>(DB_NAME, DB_VERSION, {
      // Each step guarded by where the reader actually is, and each creating
      // only what that step added. A database opened for the first time runs
      // every step; one already on 1 runs only the second and keeps its cards.
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const decks = db.createObjectStore('decks', { keyPath: 'id' });
          decks.createIndex('by-language', 'language');

          const cards = db.createObjectStore('cards', { keyPath: 'id' });
          cards.createIndex('by-deck', 'deckId');
          cards.createIndex('by-due', 'due');

          const reviews = db.createObjectStore('reviews', { keyPath: 'id' });
          reviews.createIndex('by-card', 'cardId');
          reviews.createIndex('by-time', 'reviewedAt');
        }
        if (oldVersion < 2) {
          const notes = db.createObjectStore('notes', { keyPath: 'id' });
          notes.createIndex('by-language', 'language');
        }
        if (oldVersion < 3) {
          const practice = db.createObjectStore('practice', { keyPath: 'id' });
          practice.createIndex('by-day', 'day');
        }
        if (oldVersion < 4) {
          // No index: there are at most a handful of these and every reader of
          // them wants the whole set.
          db.createObjectStore('repairs', { keyPath: 'day' });
        }
        if (oldVersion < 5) {
          db.createObjectStore('extensions', { keyPath: 'id' });
        }
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
export async function gradeCard(
  card: Card,
  direction: Direction,
  grade: Grade,
  now: number = Date.now(),
): Promise<{ card: Card; entryId: string }> {
  const before = scheduleOf(card, direction);
  // Math.random here rather than inside the scheduler, so the preview the
  // reader was shown stays exact and only the grade they actually pressed
  // spreads. See the note on FUZZ_RATIO.
  const next = schedule(before, grade, now, Math.random);
  const updated = withSchedule(card, direction, next);

  const entry: ReviewLogEntry = {
    // The direction is in the key: both of a card's questions can be graded
    // inside the same millisecond, and the second would have overwritten the
    // first when the id was only the card and the clock.
    id: `${card.id}:${direction}:${now}`,
    cardId: card.id,
    deckId: card.deckId,
    grade,
    reviewedAt: now,
    intervalBefore: before.interval,
    intervalAfter: next.interval,
    direction,
  };

  const db = await getDB();
  const tx = db.transaction(['cards', 'reviews'], 'readwrite');
  await Promise.all([
    tx.objectStore('cards').put(updated),
    tx.objectStore('reviews').put(entry),
    tx.done,
  ]);

  return { card: updated, entryId: entry.id };
}

/**
 * Puts a card back the way it was before a grade, and unwrites the grade.
 *
 * The card is restored wholesale from a snapshot taken before it was graded
 * rather than reconstructed from the log, because the log records what the
 * interval went from and to but not the ease, the reps or the lapses — enough to
 * describe a review, not enough to reverse one.
 *
 * Both halves in one transaction: a card put back while its review still counted
 * would leave the streak and the week's totals claiming work that no longer
 * exists anywhere.
 */
export async function undoReview(entryId: string, restored: Card): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['cards', 'reviews'], 'readwrite');
  await Promise.all([
    tx.objectStore('cards').put(restored),
    tx.objectStore('reviews').delete(entryId),
    tx.done,
  ]);
}

export async function listNotes(language: LanguageCode): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAllFromIndex('notes', 'by-language', language);
  return notes.sort((a, b) => a.title.localeCompare(b.title));
}

export async function putNote(note: Note): Promise<void> {
  const db = await getDB();
  await db.put('notes', note);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('notes', id);
}

/**
 * Writes the starter notes, gated on the notes store rather than on decks.
 *
 * Anyone already using the app has decks, so hanging this off ensureSeeded's
 * emptiness check would mean the starter notes only ever reached people who
 * installed after they existed.
 */
export async function ensureNotesSeeded(): Promise<void> {
  const db = await getDB();
  if (await db.count('notes')) return;
  const notes = buildSeedNotes();
  const tx = db.transaction('notes', 'readwrite');
  await Promise.all([...notes.map((n: Note) => tx.store.put(n)), tx.done]);
}

export async function reviewsSince(since: number): Promise<ReviewLogEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('reviews', 'by-time', IDBKeyRange.lowerBound(since));
}

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** One day in the window, and what was practised on it. */
export interface DayPractised {
  /** The same key `computeStreak` walks. */
  day: string;
  /** Any moment inside that day, for formatting. */
  at: number;
  tools: PracticeTool[];
  /** Held by an extension rather than practised. Never both — see settleExtensions. */
  extended?: boolean;
}

/** A day key back to the local midnight it names. Inverse of `dayKey`. */
const stampOfDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m, d).getTime();
};

/**
 * Every day that counts, from all three places one can come from.
 *
 * Grading writes a review row and nothing else, so flashcards are read out of
 * the log rather than recorded twice with a way to disagree. The drill writes a
 * practice row. A day an extension covered was not practised at all, and counts
 * all the same — that is what holding one is for.
 */
async function practisedDays(): Promise<Set<string>> {
  const db = await getDB();
  const [reviews, practice, extensions] = await Promise.all([
    db.getAll('reviews'), db.getAll('practice'), db.getAll('extensions'),
  ]);
  return new Set([
    ...reviews.map((r) => dayKey(r.reviewedAt)),
    ...practice.map((p) => p.day),
    ...extensions.flatMap((e) => (e.usedOn ? [e.usedOn] : [])),
  ]);
}

/**
 * Consecutive days ending today, or yesterday when today is not counted yet.
 *
 * Split out from computeStreak so that an offer can be priced by simulating it
 * — asking what the streak would be with one more day in the set — rather than
 * by a second implementation of the same walk that could drift from this one.
 */
function streakFrom(days: Set<string>, now: number): number {
  if (!days.size) return 0;
  const DAY_MS = 24 * 60 * 60 * 1000;
  // Practising today isn't required to hold a streak until the day is over, so
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

/** Local midnight, so two moments on the same day compare equal. */
const midnight = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * The last `days` days, oldest first, each carrying which tools were used.
 *
 * The same union of the review log and the practice store that the streak
 * walks — the streak just throws the tool away, and the tool is the only thing
 * here a number cannot say. Days with nothing on them are included: a fortnight
 * is a shape, and leaving the gaps out would draw a different one.
 */
export async function practiceDays(days = 14, now: number = Date.now()): Promise<DayPractised[]> {
  const db = await getDB();
  const [reviews, practice, extensions] = await Promise.all([
    db.getAll('reviews'), db.getAll('practice'), db.getAll('extensions'),
  ]);
  const covered = new Set(extensions.flatMap((e) => (e.usedOn ? [e.usedOn] : [])));

  const byDay = new Map<string, Set<PracticeTool>>();
  const add = (key: string, tool: PracticeTool) => {
    const set = byDay.get(key) ?? new Set<PracticeTool>();
    set.add(tool);
    byDay.set(key, set);
  };
  // A graded card is Flashcards practice; it writes a review row rather than a
  // practice one, so it is read back the same way computeStreak reads it.
  for (const r of reviews) add(dayKey(r.reviewedAt), 'cards');
  for (const p of practice) add(p.day, p.tool);

  const out: DayPractised[] = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    const at = new Date(now);
    at.setDate(at.getDate() - back);
    const key = dayKey(at.getTime());
    out.push({
      day: key, at: at.getTime(), tools: [...(byDay.get(key) ?? [])],
      // Marked, not disguised. The day holds the streak, and the calendar still
      // says an extension covered it — a fortnight that draws one as practice
      // is a record of something that did not happen.
      extended: covered.has(key) || undefined,
    });
  }
  return out;
}

/**
 * The longest run of consecutive days ever practised.
 *
 * Stepped with `setDate` rather than by adding 24 hours: the clocks change
 * twice a year, and on those two days a fixed day in milliseconds either skips
 * a date or lands on the same one twice — which would break a run that was
 * never broken, or extend one that was.
 */
export async function longestStreak(): Promise<number> {
  const db = await getDB();
  const [reviews, practice, extensions] = await Promise.all([
    db.getAll('reviews'), db.getAll('practice'), db.getAll('extensions'),
  ]);
  const dayStamps = [
    ...reviews.map((r) => midnight(r.reviewedAt)),
    ...practice.map((p) => midnight(p.at)),
    // The day covered, not the day it was bought on — `at` is the purchase.
    ...extensions.flatMap((e) => (e.usedOn ? [stampOfDay(e.usedOn)] : [])),
  ];
  const unique = [...new Set(dayStamps)].sort((a, b) => a - b);
  if (!unique.length) return 0;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const expected = new Date(unique[i - 1]);
    expected.setDate(expected.getDate() + 1);
    run = expected.getTime() === unique[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return longest;
}

/**
 * Notes that a tool was used for its exercise today.
 *
 * Idempotent by construction — the key is the day and the tool — so a caller
 * can hand this every answer without thinking about it.
 */
export async function recordPractice(tool: PracticeTool, now: number = Date.now()): Promise<void> {
  const db = await getDB();
  const day = dayKey(now);
  await db.put('practice', { id: `${day}|${tool}`, day, tool, at: now });
}

/**
 * Consecutive days ending today (or yesterday, if today is not yet counted) on
 * which the reader practised. A gap of a full day ends the streak.
 *
 * Practice is answering something: a card graded, or a form answered in the
 * drill. Not opening a screen. The Explorer and the notes are worth reading and
 * are deliberately not counted — a streak that ticks for reading a page is a
 * streak that counts opening the app, and it would stop meaning anything the
 * day someone noticed.
 *
 * Two sources rather than one because grading already writes a review row, and
 * a second write beside it would be a fact stored twice with a way to disagree.
 */
export async function computeStreak(now: number = Date.now()): Promise<number> {
  return streakFrom(await practisedDays(), now);
}

/* ── points and streak extensions ─────────────────────────────────────────── */

/**
 * What practice is worth, and what an extension costs.
 *
 * Points are not a balance anyone keeps. They are read out of the record of
 * what happened — the review log and the practice store — minus what has been
 * spent, so there is no counter to drift out of step with the history it is
 * supposed to summarise, and nothing to reconcile after a restore.
 *
 * A review is worth one because there is a row per review. A day practised is
 * worth five on top, from any tool, which is what gives the drill anything at
 * all: it records the day rather than the answer, so a per-record rule would
 * quietly pay for flashcards only.
 *
 * The day is counted once however many tools were used, and a day an extension
 * covered does not count — a bought day that paid points back would be a loop.
 *
 * A twenty-card session earns 25, so an extension is about two days of real
 * practice: enough that it comes out of something done, and not so much that it
 * is out of reach.
 */
export const POINTS = { perReview: 1, perDay: 5, extension: 50 } as const;

/**
 * How many extensions may be held at once.
 *
 * Not a lifetime allowance and not a monthly one. Two is what can be waiting
 * when a day is missed, and spending one frees the slot to buy another — so
 * points always have somewhere to go, and nobody can bank a fortnight of
 * absence. Two consecutive missed days is the most a full inventory covers.
 */
export const EXTENSION_CAP = 2;

export interface Points {
  earned: number;
  spent: number;
  balance: number;
  /** Held, unspent. At most EXTENSION_CAP. */
  held: number;
  /** How many days an extension has covered. */
  used: number;
}

export async function points(): Promise<Points> {
  const db = await getDB();
  const [reviews, practice, extensions] = await Promise.all([
    db.getAll('reviews'), db.getAll('practice'), db.getAll('extensions'),
  ]);
  const worked = new Set([
    ...reviews.map((r) => dayKey(r.reviewedAt)),
    ...practice.map((p) => p.day),
  ]);
  const earned = reviews.length * POINTS.perReview + worked.size * POINTS.perDay;
  const spent = extensions.reduce((n, e) => n + e.cost, 0);
  return {
    earned,
    spent,
    balance: earned - spent,
    held: extensions.filter((e) => !e.usedOn).length,
    used: extensions.filter((e) => e.usedOn).length,
  };
}

/**
 * Buys one, if there is a slot for it and the points are there.
 *
 * Both checks are made here rather than trusted from the caller: the balance is
 * derived from stores anything can write to, so a number the UI read a moment
 * ago is a guess about the present, and the cap is the rule this whole feature
 * rests on.
 */
export async function buyExtension(now: number = Date.now()): Promise<boolean> {
  const db = await getDB();
  const { balance, held } = await points();
  if (held >= EXTENSION_CAP) return false;
  if (balance < POINTS.extension) return false;
  await db.put('extensions', { id: `ext-${now}-${held}`, at: now, cost: POINTS.extension });
  return true;
}

/**
 * Spends held extensions on days that were missed, and says how many it spent.
 *
 * The whole point of holding one is that someone who forgot to practise cannot
 * come back and press a button — so this runs on the way to reading the streak
 * rather than being invoked by anyone, and it writes what it decides so that a
 * covered day stays covered and the extension is really gone.
 *
 * It only spends where spending achieves something. Walking back from
 * yesterday — today is not lapsed until it is over — it counts the run of
 * consecutive days with nothing on them:
 *
 *   - none, and there is nothing to cover;
 *   - more than are held, and the streak is broken whatever we do, so nothing
 *     is spent rather than two extensions burned on a run that ended anyway;
 *   - otherwise the day before the gap was practised, which is what makes it a
 *     gap, so covering it joins today to that run.
 *
 * The search is bounded at one day past the number held, because that is the
 * point at which the answer is already no.
 */
export async function settleExtensions(now: number = Date.now()): Promise<number> {
  const db = await getDB();
  const held = (await db.getAll('extensions')).filter((e) => !e.usedOn);
  if (!held.length) return 0;

  const days = await practisedDays();
  const gaps: string[] = [];
  const at = new Date(now);
  at.setDate(at.getDate() - 1);
  for (let back = 0; back <= held.length; back += 1) {
    const key = dayKey(at.getTime());
    if (days.has(key)) break;
    gaps.push(key);
    at.setDate(at.getDate() - 1);
  }
  // Nothing to bridge, or more to bridge than we can afford.
  if (!gaps.length || gaps.length > held.length) return 0;

  const tx = db.transaction('extensions', 'readwrite');
  await Promise.all([
    ...gaps.map((day, i) => tx.store.put({ ...held[i], usedOn: day })),
    tx.done,
  ]);
  return gaps.length;
}

/**
 * Version 4's repaired days, carried into the extensions that replaced them.
 *
 * Idempotent and it reads before it writes: once the old store is empty there
 * is nothing to do, which is the case on every boot but the one after this
 * ships. A repaired day becomes an extension already spent on that day, at the
 * price that was actually paid, so the ledger and the calendar both come out
 * where they were.
 */
export async function migrateRepairs(): Promise<number> {
  const db = await getDB();
  const old = await db.getAll('repairs');
  if (!old.length) return 0;
  const tx = db.transaction(['repairs', 'extensions'], 'readwrite');
  await Promise.all([
    ...old.map((r) => tx.objectStore('extensions').put({
      id: `repair-${r.day}`, at: r.at, cost: r.cost, usedOn: r.day,
    })),
    ...old.map((r) => tx.objectStore('repairs').delete(r.day)),
    tx.done,
  ]);
  return old.length;
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
export async function exportAll(): Promise<{
  decks: Deck[]; cards: Card[]; reviews: ReviewLogEntry[]; notes: Note[];
  practice: PracticeDay[]; extensions: StreakExtension[];
}> {
  const db = await getDB();
  const [decks, cards, reviews, notes, practice, extensions] = await Promise.all([
    db.getAll('decks'),
    db.getAll('cards'),
    db.getAll('reviews'),
    db.getAll('notes'),
    db.getAll('practice'),
    db.getAll('extensions'),
  ]);
  return { decks, cards, reviews, notes, practice, extensions };
}

export interface ImportCounts {
  decks: number; cards: number; reviews: number; notes: number;
  skipped: { decks: number; cards: number; reviews: number; notes: number };
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
  // notes optional: a backup written before they existed simply has none, and
  // is still a perfectly good backup of everything it did have.
  // practice optional for the same reason as notes: a backup written before the
  // drill existed simply has none, and is still a good backup of what it held.
  data: {
    decks: Deck[]; cards: Card[]; reviews: ReviewLogEntry[];
    notes?: Note[]; practice?: PracticeDay[]; extensions?: StreakExtension[];
  },
): Promise<ImportCounts> {
  const db = await getDB();
  const existing = await exportAll();
  const incomingNotes = data.notes ?? [];
  const incomingPractice = data.practice ?? [];
  // Restoring the practice without the extensions would hand back the points
  // that were already spent, and quietly break every streak they were holding.
  const incomingExtensions = data.extensions ?? [];
  const has = {
    decks: new Set(existing.decks.map((d) => d.id)),
    cards: new Set(existing.cards.map((c) => c.id)),
    reviews: new Set(existing.reviews.map((r) => r.id)),
    notes: new Set(existing.notes.map((n) => n.id)),
    practice: new Set(existing.practice.map((p) => p.id)),
    extensions: new Set(existing.extensions.map((e) => e.id)),
  };

  const fresh = {
    decks: data.decks.filter((d) => !has.decks.has(d.id)),
    cards: data.cards.filter((c) => !has.cards.has(c.id)),
    reviews: data.reviews.filter((r) => !has.reviews.has(r.id)),
    notes: incomingNotes.filter((n) => !has.notes.has(n.id)),
    practice: incomingPractice.filter((p) => !has.practice.has(p.id)),
    extensions: incomingExtensions.filter((e) => !has.extensions.has(e.id)),
  };

  const tx = db.transaction(['decks', 'cards', 'reviews', 'notes', 'practice', 'extensions'], 'readwrite');
  await Promise.all([
    ...fresh.decks.map((d) => tx.objectStore('decks').put(d)),
    ...fresh.cards.map((c) => tx.objectStore('cards').put(c)),
    ...fresh.reviews.map((r) => tx.objectStore('reviews').put(r)),
    ...fresh.notes.map((n) => tx.objectStore('notes').put(n)),
    ...fresh.practice.map((p) => tx.objectStore('practice').put(p)),
    ...fresh.extensions.map((e) => tx.objectStore('extensions').put(e)),
    tx.done,
  ]);

  return {
    decks: fresh.decks.length,
    cards: fresh.cards.length,
    reviews: fresh.reviews.length,
    notes: fresh.notes.length,
    skipped: {
      decks: data.decks.length - fresh.decks.length,
      cards: data.cards.length - fresh.cards.length,
      reviews: data.reviews.length - fresh.reviews.length,
      notes: incomingNotes.length - fresh.notes.length,
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
  const tx = db.transaction(['decks', 'cards', 'reviews', 'notes', 'practice', 'extensions'], 'readwrite');
  await Promise.all([
    tx.objectStore('decks').clear(),
    tx.objectStore('cards').clear(),
    tx.objectStore('reviews').clear(),
    tx.objectStore('notes').clear(),
    tx.objectStore('practice').clear(),
    tx.done,
  ]);
  localStorage.removeItem(PREFS_KEY);
  // The latch below caches the fact that seeding has already happened, which
  // emptying the database has just made untrue. Without this, the ensureSeeded()
  // that follows a reset returns the resolved promise from boot without doing
  // anything, and the starter decks the button promises never come back.
  seeding = null;
}
