import type { Card, Direction, Grade, Schedule } from './types';

/**
 * SM-2, adapted to the four grades the design's ReviewRating emits.
 *
 * The reference card in the design system labels a new card's four buttons
 * `<1m · 6m · 1d · 4d`, so those are the literal steps a new card takes here.
 * Once a card graduates, intervals are computed from its ease factor and the
 * labels shown on the buttons follow the real numbers.
 */

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

const MIN_EASE = 1.3;
const START_EASE = 2.5;
/** Nothing is worth scheduling more than a year out. */
const MAX_INTERVAL_DAYS = 365;

/**
 * How far an interval may be nudged either side of what the formula said.
 *
 * Without this, cards learned on the same day are scheduled by the same
 * multiplier from the same date and never come apart: seed a deck on a Sunday
 * and every card in it falls due together for the rest of its life, so a session
 * is either forty cards or none. The spread costs nothing in accuracy — a review
 * a day either side of ten days is the same review — and buys a queue that
 * levels out.
 *
 * A percentage alone does nothing at short intervals, where 5% of three days
 * rounds back to three, so the short end gets a whole day instead.
 */
const FUZZ_RATIO = 0.05;
const FUZZ_MIN_INTERVAL = 2;

/** Spreads an interval, given something that returns 0..1. */
function fuzzInterval(days: number, rand: () => number): number {
  if (days < FUZZ_MIN_INTERVAL) return days;
  const spread = Math.max(1, Math.round(days * FUZZ_RATIO));
  // -spread..+spread inclusive.
  const shift = Math.round((rand() * 2 - 1) * spread);
  return Math.max(1, days + shift);
}

/** Minute-scale steps for cards that have not graduated yet. */
const AGAIN_STEP_MIN = 1;
const HARD_STEP_MIN = 6;
const RELEARN_STEP_MIN = 10;

/** Days a card graduates to, straight out of learning. */
const GRADUATE_GOOD_DAYS = 1;
const GRADUATE_EASY_DAYS = 4;

/** Identical to Schedule; kept as a name for what a grade returns. */
export type SchedulerResult = Schedule;

const clampEase = (e: number) => Math.max(MIN_EASE, Math.round(e * 100) / 100);
const clampInterval = (d: number) => Math.min(MAX_INTERVAL_DAYS, Math.max(0, d));

/**
 * Applies a grade to one schedule and returns the next.
 *
 * Takes a Schedule rather than a Card, because a card has two of them and this
 * function never wanted the word or its meaning — only where the memory stood.
 * `now` is injected so sessions and tests are deterministic.
 */
export function schedule(
  card: Schedule,
  grade: Grade,
  now: number = Date.now(),
  /**
   * Supply a random source to spread the interval; omit for the exact number.
   *
   * Off by default on purpose. gradePreview puts a figure on each of the four
   * buttons before you press one, and a preview that says 10d while the grade
   * quietly books 11 is a preview that lies. Only the real grade fuzzes.
   */
  rand?: () => number,
): SchedulerResult {
  const learning = card.state === 'new' || card.state === 'learning';
  const relearning = card.state === 'relearning';

  // Still in (or back in) minute-scale steps.
  if (learning || relearning) {
    if (grade === 'again') {
      return {
        state: relearning ? 'relearning' : 'learning',
        due: now + AGAIN_STEP_MIN * MINUTE,
        interval: 0,
        ease: card.ease,
        reps: card.reps + 1,
        lapses: card.lapses,
      };
    }
    if (grade === 'hard') {
      return {
        state: relearning ? 'relearning' : 'learning',
        due: now + HARD_STEP_MIN * MINUTE,
        interval: 0,
        ease: card.ease,
        reps: card.reps + 1,
        lapses: card.lapses,
      };
    }
    // good / easy graduate the card into review.
    const days = grade === 'easy'
      ? GRADUATE_EASY_DAYS
      : relearning
        // A relearned card resumes near where it was rather than restarting.
        ? Math.max(GRADUATE_GOOD_DAYS, Math.round(card.interval * 0.5))
        : GRADUATE_GOOD_DAYS;
    return {
      state: 'review',
      due: now + days * DAY,
      interval: clampInterval(days),
      ease: card.ease,
      reps: card.reps + 1,
      lapses: card.lapses,
    };
  }

  // Card is in review.
  if (grade === 'again') {
    return {
      state: 'relearning',
      due: now + RELEARN_STEP_MIN * MINUTE,
      interval: clampInterval(Math.max(1, card.interval * 0.5)),
      ease: clampEase(card.ease - 0.2),
      reps: card.reps + 1,
      lapses: card.lapses + 1,
    };
  }

  const ease = grade === 'hard'
    ? clampEase(card.ease - 0.15)
    : grade === 'easy'
      ? clampEase(card.ease + 0.15)
      : card.ease;

  const base = Math.max(1, card.interval);
  const exact = Math.round(
    grade === 'hard' ? base * 1.2
      : grade === 'easy' ? base * ease * 1.3
        : base * ease,
  );
  const days = clampInterval(rand ? fuzzInterval(exact, rand) : exact);

  return {
    state: 'review',
    due: now + days * DAY,
    interval: days,
    ease,
    reps: card.reps + 1,
    lapses: card.lapses,
  };
}

/** Short-form interval label, per the design's content rules: `<1m`, `6m`, `1d`, `4d`. */
export function formatDue(ms: number): string {
  if (ms < MINUTE) return '<1m';
  const minutes = ms / MINUTE;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months)}mo`;
  return `${Math.round(months / 12)}y`;
}

/** The four grades with the interval each would actually produce from here. */
export function gradePreview(card: Schedule, now: number = Date.now()) {
  const grades: Grade[] = ['again', 'hard', 'good', 'easy'];
  return grades.map((key) => ({
    key,
    due: formatDue(Math.max(0, schedule(card, key, now).due - now)),
  }));
}

export function isDue(card: Schedule, now: number = Date.now()): boolean {
  return card.due <= now;
}

/** A direction that has never been asked, waiting from the card's own birthday. */
const freshSchedule = (createdAt: number): Schedule => ({
  state: 'new', due: createdAt, interval: 0, ease: START_EASE, reps: 0, lapses: 0,
});

/**
 * The schedule for one direction of a card.
 *
 * Forward reads the flat fields; reverse reads `card.reverse`, or a fresh
 * schedule if that direction has never been asked. See the note on `Card.reverse`
 * for why the two are not stored alike.
 */
export function scheduleOf(card: Card, direction: Direction): Schedule {
  if (direction === 'forward') {
    const { state, due, interval, ease, reps, lapses } = card;
    return { state, due, interval, ease, reps, lapses };
  }
  return card.reverse ?? freshSchedule(card.createdAt);
}

/** Puts a graded schedule back on the card, in the place that direction lives. */
export function withSchedule(card: Card, direction: Direction, next: Schedule): Card {
  return direction === 'forward' ? { ...card, ...next } : { ...card, reverse: next };
}

/** The directions this card is currently asked in — one, or both. */
export function directionsOf(card: Card): Direction[] {
  return card.reversed ? ['forward', 'reverse'] : ['forward'];
}

/** Every question this card owes right now, as queue items. */
export function dueDirections(card: Card, now: number = Date.now()): Direction[] {
  return directionsOf(card).filter((d) => isDue(scheduleOf(card, d), now));
}

/** New questions first, then whatever has been waiting longest. */
export function sortForSession(items: { card: Card; direction: Direction }[]) {
  return [...items].sort((a, b) => {
    const sa = scheduleOf(a.card, a.direction);
    const sb = scheduleOf(b.card, b.direction);
    if (sa.state === 'new' && sb.state !== 'new') return -1;
    if (sb.state === 'new' && sa.state !== 'new') return 1;
    return sa.due - sb.due;
  });
}

export { START_EASE };
