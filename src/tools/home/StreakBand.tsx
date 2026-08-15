import * as React from 'react';
import { Card, useIsMobile } from 'lingo-ds';
import * as db from '../../data/db';
import type { PracticeTool } from '../../data/types';

/**
 * A fortnight of practice, on the dashboard.
 *
 * Not a screen. The streak is one number and the review log is routinely empty
 * — measured on a real install: 163 cards, a streak of one day, and not a
 * single graded review — so a page built on it would be a page of blank charts.
 * A band is just a band with one mark in it, and Home is already the screen
 * people open.
 *
 * What makes it worth building is the colour rather than the count: the
 * practice store knows *which* tool was used on which day, and nothing in the
 * app has ever shown that.
 */

/** Two rows of seven. A week per row is the shape a fortnight actually has. */
const DAYS = 14;

/** The tool each mark is coloured by, in the same tokens the rail uses. */
const TOOL_COLOR: Record<PracticeTool, string> = {
  cards: 'var(--tool-flashcards)',
  conjugation: 'var(--tool-conjugation)',
};

/** A day with more than one tool on it takes the streak's own amber. */
const BOTH = 'var(--streak)';

/**
 * A day that was bought rather than practised.
 *
 * Muted on purpose, and never one of the tool colours: it holds the streak, and
 * the calendar still says what happened. A fortnight that drew a repair as
 * practice would be a record of something nobody did.
 */
export const REPAIRED = 'var(--text-muted)';

const colorFor = (day: db.DayPractised) =>
  (day.repaired && !day.tools.length ? REPAIRED
    : day.tools.length > 1 ? BOTH
      : day.tools.length === 1 ? TOOL_COLOR[day.tools[0]] : null);

const TOOL_NAME: Record<PracticeTool, string> = { cards: 'Flashcards', conjugation: 'Drill' };

/**
 * One square in the calendar.
 *
 * Exported because the Points card shows the day it is offering to put back,
 * and it has to be the same square: the offer sits beside this fortnight, and
 * two different drawings of "a day" would be two different ideas of one.
 *
 * `filled` is separate from `color` so a day can be coloured without being
 * claimed — a repair is drawn in outline, and so is the day the card is only
 * offering.
 */
export function DayMark({ label, color, filled = true, ring, size }: {
  label: React.ReactNode;
  color: string | null;
  filled?: boolean;
  /** A second outline outside the square, for "now" or "this is the one". */
  ring?: string;
  /** Fixed px instead of filling its grid cell. */
  size?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        aspectRatio: '1', display: 'grid', placeItems: 'center',
        width: size, flex: size ? 'none' : undefined,
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-11)',
        // A day that happened is filled and legible; one that did not is the
        // sunken surface, which reads as an absence rather than as a failure.
        background: color && filled
          ? `color-mix(in oklab, ${color} 24%, var(--surface-card))`
          : 'var(--surface-sunken)',
        boxShadow: color
          ? `inset 0 0 0 1px color-mix(in oklab, ${color} 55%, transparent)`
          : 'var(--ring-inset)',
        color: color ? 'var(--text-strong)' : 'var(--text-faint)',
        outline: ring ? `2px solid ${ring}` : undefined,
        outlineOffset: 2,
      }}
    >
      {label}
    </span>
  );
}

function Mark({ day, today }: { day: db.DayPractised; today: boolean }) {
  const color = colorFor(day);
  return (
    <DayMark
      label={new Date(day.at).getDate()}
      color={color}
      // A repair holds the streak without having been practised, so it keeps
      // the outline and not the fill.
      filled={!day.repaired}
      // Today is outlined rather than filled, so the ring says "now" without
      // claiming the day has been practised when it has not.
      ring={today ? (color ?? 'var(--border-strong)') : undefined}
    />
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 10, height: 10, borderRadius: 3, flex: 'none',
          background: `color-mix(in oklab, ${color} 24%, var(--surface-card))`,
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 55%, transparent)`,
        }}
      />
      {label}
    </span>
  );
}

export function StreakBand({ streak }: { streak: number }) {
  const isMobile = useIsMobile();
  const [days, setDays] = React.useState<db.DayPractised[] | null>(null);
  const [longest, setLongest] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    void Promise.all([db.practiceDays(DAYS), db.longestStreak()]).then(([d, l]) => {
      if (!live) return;
      setDays(d);
      setLongest(l);
    });
    return () => { live = false; };
    // Re-read when the streak moves, which is the one thing that changes it.
  }, [streak]);

  const practised = days?.filter((d) => d.tools.length || d.repaired) ?? [];

  /*
   * Absent, not empty.
   *
   * A fortnight of blank squares on a fresh install is a reproach, and the app
   * does not show `0 days` anywhere else either. The band arrives with the
   * first day practised and leaves again if a fortnight passes with nothing in
   * it — which is honest rather than a punishment, since there is by then
   * nothing it could truthfully draw.
   */
  if (!days || !practised.length) return null;

  const todayKey = days[days.length - 1].day;
  const usedTools = new Set(practised.flatMap((d) => d.tools));

  return (
    <section style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)', fontWeight: 800, color: 'var(--text-strong)' }}>
          Streak
        </h2>
        {/* States the rule rather than urging anyone to meet it. */}
        <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>
          One exercise a day keeps it going.
        </p>
      </div>

      <Card style={{ flex: 1 }}>
        {/*
          * The calendar takes the width it needs; the legend and the count take
          * the rest.
          *
          * They used to be stacked under it. The marks cap at 44px so the
          * fortnight is about 380px wide however wide the card is, and in a
          * two-thirds column on a desktop that left a third of the card empty
          * to the right of it while the same card grew taller underneath.
          * Standing them beside it fills the one and shortens the other, which
          * is also what brings this card and the points card to a similar
          * height.
          *
          * Stacked again on a phone, where the card is narrow enough that the
          * marks are already shrinking to fit and there is no width to take.
          */}
        <div
          style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            // Stretch, not flex-start: the column beside the calendar has to be
            // as tall as the card for its last line to reach the bottom edge.
            // The calendar opts out below, since a stretched grid of
            // aspect-ratio squares would grow them.
            alignItems: 'stretch',
            gap: isMobile ? 'var(--gap-stack)' : 'var(--space-7)',
            // Fills the card, so the caption below can reach its bottom edge.
            flex: 1,
          }}
        >
          <div
            role="img"
            aria-label={`${practised.length} of the last ${DAYS} days practised.${streak > 0 ? ` ${streak === 1 ? '1 day' : `${streak} days`} in a row.` : ''}`}
            style={{
              display: 'grid',
              // Seven across, capped so the marks stay marks on a wide screen
              // rather than growing into tiles.
              gridTemplateColumns: 'repeat(7, minmax(0, 44px))',
              gap: 'var(--space-3)',
              flex: isMobile ? undefined : 'none',
              alignSelf: 'flex-start',
            }}
          >
            {days.map((d) => <Mark key={d.day} day={d} today={d.day === todayKey} />)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0, flex: 1 }}>
            {/* Only the tools actually used. A key to a colour that is not on
                the board is a legend for something that did not happen. */}
            <div
              style={{
                display: 'flex', flexDirection: isMobile ? 'row' : 'column',
                gap: isMobile ? 'var(--space-5)' : 'var(--space-3)', flexWrap: 'wrap',
                fontSize: 'var(--fs-11)', fontWeight: 700, letterSpacing: 'var(--ls-caps)',
                textTransform: 'uppercase', color: 'var(--text-muted)',
              }}
            >
              {usedTools.has('cards') && <Key color={TOOL_COLOR.cards} label={TOOL_NAME.cards} />}
              {usedTools.has('conjugation') && <Key color={TOOL_COLOR.conjugation} label={TOOL_NAME.conjugation} />}
              {practised.some((d) => d.tools.length > 1) && <Key color={BOTH} label="Both" />}
              {practised.some((d) => d.repaired) && <Key color={REPAIRED} label="Put back" />}
            </div>

            {/*
              * The count is the caption, not the headline.
              *
              * A run of days is the result of practising, so the marks are the
              * statement. Longest is only worth saying while it is still ahead
              * — once the current run is the record, printing both says the
              * same thing twice.
              *
              * And a broken streak says nothing at all. This printed "0 days in
              * a row" whenever the run had lapsed but the fortnight still had
              * marks in it, which is the one sentence the design system rules
              * out by name: an empty streak is a fact nobody needs, and the
              * calendar has already said it without the reproach. The record
              * stays, because what someone did is worth keeping either way.
              */}
            <p
              style={{
                margin: 0, fontSize: 'var(--fs-15)', color: 'var(--text-muted)',
                lineHeight: 'var(--lh-relaxed)',
                // The legend stays with the marks it explains; the count drops
                // to the bottom, which is what makes the card fill its height
                // by arranging itself rather than by padding.
                marginTop: isMobile ? undefined : 'auto',
              }}
            >
              {streak > 0 && (
                <strong style={{ color: 'var(--text-strong)', fontWeight: 800 }}>
                  {streak === 1 ? '1 day' : `${streak} days`} in a row
                </strong>
              )}
              {longest > streak && `${streak > 0 ? ' · longest so far ' : 'Longest so far '}${longest}`}
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
