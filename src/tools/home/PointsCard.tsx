import * as React from 'react';
import { Button, Card, Icon, ProgressBar, Tooltip, playSound, useIsTouch } from 'lingo-ds';
import * as db from '../../data/db';
import { DayMark, REPAIRED } from './StreakBand';

/**
 * Points, and the one thing they buy.
 *
 * The balance is not a score. It is the same practice the streak already counts,
 * read a second way — a point a card, five for the day — so nothing new has to
 * be tracked and there is no number that can disagree with the history behind
 * it. See db.points.
 *
 * The whole feature exists to make a missed day repairable. The design system's
 * rule is that repair is fine and pressure is not: this card says what has been
 * earned and what it would do, once, without a countdown, without asking, and
 * without ever mentioning what is about to be lost. It offers a single day
 * because a single day is the only one worth buying — see db.nextRepair.
 *
 * Shown rather than described. The first draft was four stacked sentences — a
 * price, a date, a shortfall and a total — which is a lot of prose for four
 * numbers. The day being offered is now drawn as the same square the calendar
 * beside it uses, the shortfall is the gap left in a bar, and the earning rule
 * has moved into a tooltip on the mark, since it is a thing to look up once and
 * never read again.
 */

/** What the number is for. Read once, then never again — hence the tooltip. */
const HELP = 'Earned by practising: a point a card, and five for the day.';

/**
 * "Thu" and "13", split so the square can hold the number and the label the day.
 *
 * Pinned to en-GB rather than left to the reader's locale. The app's copy is
 * English, and `undefined` takes the browser's: on a Dutch machine the button
 * came out "Put za 15 back", which is neither language.
 */
const weekday = (at: number) => new Date(at).toLocaleDateString('en-GB', { weekday: 'short' });
const dayLabel = (at: number) => `${weekday(at)} ${new Date(at).getDate()}`;

/**
 * The offer, drawn: this day goes back, and the run becomes this long.
 *
 * The square is the calendar's own — see DayMark — in the muted tone a repaired
 * day takes there, so what the card is proposing and what the fortnight would
 * show afterwards are visibly the same thing.
 */
function Offer({ offer }: { offer: db.RepairOffer }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {/* Ringed, as the calendar rings today: it means "this is the one",
            not "this is done". The square stays unfilled, because it is being
            offered rather than held — at 40px the 1px inset alone was too
            quiet to read as anything but an empty box. */}
        <DayMark
          label={new Date(offer.at).getDate()}
          color={REPAIRED}
          filled={false}
          ring={REPAIRED}
          size={40}
        />
        <span style={{ fontSize: 'var(--fs-11)', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          {weekday(offer.at)}
        </span>
      </div>

      <Icon name="arrow-right" size={16} style={{ color: 'var(--text-faint)', flex: 'none' }} />

      {/* The result, in the streak's own flame and amber. Stated as what the
          run becomes, never as what it would otherwise have been. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Icon name="flame" size={18} style={{ color: 'var(--streak)', flex: 'none' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-24)', color: 'var(--text-strong)', lineHeight: 1 }}>
          {offer.wouldMake}
        </span>
        <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
          {offer.wouldMake === 1 ? 'day' : 'days'}
        </span>
      </div>
    </div>
  );
}

export function PointsCard({ points, offer, onRepair }: {
  points: db.Points;
  offer: db.RepairOffer | null;
  onRepair: (day: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = React.useState(false);
  /* A tooltip needs a pointer. On a touch screen the rule would simply be
     unreachable, so there it goes back to being a line of text — which is what
     the card has room for there anyway, being full width rather than a third
     of one. */
  const touch = useIsTouch();

  /*
   * Absent, not empty — the same rule the band beside it follows. A points card
   * reading 0 on a fresh install is a debt notice for something nobody has had
   * the chance to do yet.
   */
  if (!points.earned) return null;

  const affordable = offer !== null && points.balance >= offer.cost;

  const buy = async () => {
    if (!offer || busy) return;
    setBusy(true);
    const done = await onRepair(offer.day);
    // The same cue a grade gets. Nothing celebratory: a repaired day is a day
    // held, not an achievement.
    if (done) playSound('toggle');
    setBusy(false);
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)', fontWeight: 800, color: 'var(--text-strong)' }}>
          Points
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>
          They can put a day back.
        </p>
      </div>

      <Card style={{ flex: 1 }}>
        {/* The balance, with the rule behind it a hover away rather than a
            paragraph under it. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {touch ? (
            <span style={{ display: 'inline-flex', color: 'var(--brand)' }}>
              <Icon name="sparkles" size={22} />
            </span>
          ) : (
            <Tooltip label={HELP}>
              <span style={{ display: 'inline-flex', color: 'var(--brand)' }}>
                <Icon name="sparkles" size={22} />
              </span>
            </Tooltip>
          )}
          <span
            style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800,
              color: 'var(--text-strong)', lineHeight: 1,
            }}
          >
            {points.balance}
          </span>
        </div>

        {touch && (
          <p style={{ margin: '-8px 0 0', fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            {HELP}
          </p>
        )}

        {offer && (
          <>
            <Offer offer={offer} />

            {affordable ? (
              <Button variant="secondary" onClick={buy} disabled={busy}>
                {busy ? 'Putting it back…' : `Put ${dayLabel(offer.at)} back`}
              </Button>
            ) : (
              /*
               * The shortfall as a bar rather than a sentence.
               *
               * An earlier draft refused a meter here on the grounds that it
               * would be pressure. It is the wrong shape for that: it fills by
               * practising rather than emptying with time, it cannot go
               * backwards, and it is not on the screen at all unless there is a
               * gap worth putting back. What it replaces — "34 more to do
               * that" — was the same fact with more reading.
               */
              <ProgressBar
                label="Toward that"
                valueLabel={`${points.balance} / ${offer.cost}`}
                value={points.balance}
                max={offer.cost}
                color="var(--brand)"
              />
            )}
          </>
        )}

        {points.repaired > 0 && (
          /* What was done with them, counted in days rather than in points —
             "50 spent" is a number nobody holds in their head. */
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 'var(--fs-13)', color: 'var(--text-faint)',
              // Sits on the bottom edge when this is the shorter card, for the
              // same reason the streak's count does.
              marginTop: touch ? undefined : 'auto',
            }}
          >
            <Icon name="rotate-ccw" size={14} style={{ flex: 'none' }} />
            {points.repaired === 1 ? '1 day put back' : `${points.repaired} days put back`}
          </div>
        )}
      </Card>
    </section>
  );
}
