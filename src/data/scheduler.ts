import type { Card, CardState, Grade } from './types';

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

/** Minute-scale steps for cards that have not graduated yet. */
const AGAIN_STEP_MIN = 1;
const HARD_STEP_MIN = 6;
const RELEARN_STEP_MIN = 10;

/** Days a card graduates to, straight out of learning. */
const GRADUATE_GOOD_DAYS = 1;
const GRADUATE_EASY_DAYS = 4;

export interface SchedulerResult {
  state: CardState;
  due: number;
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
}

const clampEase = (e: number) => Math.max(MIN_EASE, Math.round(e * 100) / 100);
const clampInterval = (d: number) => Math.min(MAX_INTERVAL_DAYS, Math.max(0, d));

/**
 * Applies a grade to a card and returns its next scheduler state.
 * `now` is injected so sessions and tests are deterministic.
 */
export function schedule(card: Card, grade: Grade, now: number = Date.now()): SchedulerResult {
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
  const days = clampInterval(Math.round(
    grade === 'hard' ? base * 1.2
      : grade === 'easy' ? base * ease * 1.3
        : base * ease,
  ));

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

/** The four grades with the interval each would actually produce for this card. */
export function gradePreview(card: Card, now: number = Date.now()) {
  const grades: Grade[] = ['again', 'hard', 'good', 'easy'];
  return grades.map((key) => ({
    key,
    due: formatDue(Math.max(0, schedule(card, key, now).due - now)),
  }));
}

export function isDue(card: Card, now: number = Date.now()): boolean {
  return card.due <= now;
}

/** New cards first, then whatever has been waiting longest. */
export function sortForSession(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.state === 'new' && b.state !== 'new') return -1;
    if (b.state === 'new' && a.state !== 'new') return 1;
    return a.due - b.due;
  });
}

export { START_EASE };
