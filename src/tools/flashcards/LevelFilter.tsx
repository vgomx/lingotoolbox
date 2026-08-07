import { playSound } from 'lingo-ds';
import { CEFR_LEVELS } from '../../data/types';
import type { CEFRLevel } from '../../data/types';

/**
 * Picks which CEFR levels to show.
 *
 * A row of toggles rather than a from/to pair, because the levels people
 * actually want are not always a run: "the A1 and A2 I have not finished, plus
 * the C1 I keep failing" is a normal thing to want and a range cannot say it.
 *
 * Empty means everything. Not every-chip-selected — a filter that has to be
 * fully lit to show you your own decks reads as a thing you have to switch off,
 * and there would be no way to express "none" anyway.
 */
export interface LevelFilterProps {
  value: ReadonlySet<CEFRLevel>;
  onChange: (next: Set<CEFRLevel>) => void;
  /** How many cards sit at each level, for the counts under the labels. */
  counts: Partial<Record<CEFRLevel, number>>;
}

export function LevelFilter({ value, onChange, counts }: LevelFilterProps) {
  const toggle = (level: CEFRLevel) => {
    playSound('tap');
    const next = new Set(value);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    onChange(next);
  };

  return (
    <div
      role="group"
      aria-label="Filter by level"
      style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
    >
      {CEFR_LEVELS.map((level) => {
        const on = value.has(level);
        const count = counts[level] ?? 0;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={on}
            // A level nobody has any cards at is shown but not offered. Hiding it
            // would make the scale change shape as the collection grows, and a
            // gap where B2 should be is harder to read than a dim B2.
            disabled={count === 0}
            onClick={() => toggle(level)}
            title={`${count} ${count === 1 ? 'card' : 'cards'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 32, padding: '0 10px', borderRadius: 'var(--radius-pill)',
              border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`,
              background: on ? 'var(--brand-subtle)' : 'transparent',
              color: count === 0 ? 'var(--text-faint)' : on ? 'var(--text-strong)' : 'var(--text-body)',
              cursor: count === 0 ? 'default' : 'pointer',
              opacity: count === 0 ? 0.5 : 1,
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)', fontWeight: 700,
              transition: 'var(--transition-control)',
            }}
          >
            {level}
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-11)', color: 'var(--text-muted)' }}>
              {count}
            </span>
          </button>
        );
      })}
      {value.size > 0 && (
        <button
          type="button"
          onClick={() => { playSound('tap'); onChange(new Set()); }}
          style={{
            height: 32, padding: '0 10px', border: 'none', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-12)', fontWeight: 700,
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
