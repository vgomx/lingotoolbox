import * as React from 'react';
import { Button, Card, playSound } from 'lingo-ds';
import * as db from '../../data/db';

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
 */

/** What the number is for, said once. */
const HELP = 'Earned by practising: a point a card, and five for the day.';

function Balance({ points }: { points: db.Points }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800,
          color: 'var(--text-strong)', lineHeight: 1,
        }}
      >
        {points.balance}
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
        {HELP}
      </p>
    </div>
  );
}

/**
 * "Thu 14" — enough to find the day on the calendar beside it, and no more.
 *
 * Pinned to en-GB rather than left to the reader's locale. The app's copy is
 * English, and `undefined` takes the browser's: on a Dutch machine the sentence
 * came out "Put za 15 back", which is neither language.
 */
const dayLabel = (at: number) =>
  new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });

export function PointsCard({ points, offer, onRepair }: {
  points: db.Points;
  offer: db.RepairOffer | null;
  onRepair: (day: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = React.useState(false);

  /*
   * Absent, not empty — the same rule the band beside it follows. A points card
   * reading 0 on a fresh install is a debt notice for something nobody has had
   * the chance to do yet.
   */
  if (!points.earned) return null;

  const affordable = offer !== null && points.balance >= offer.cost;
  const short = offer ? offer.cost - points.balance : 0;

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
    <section>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)', fontWeight: 800, color: 'var(--text-strong)' }}>
          Points
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>
          They can put a day back.
        </p>
      </div>

      <Card>
        <Balance points={points} />

        {offer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/*
              * What the purchase does, in the same breath as the price.
              *
              * Stated as a result rather than as a warning: "makes your streak
              * 6 days", never "you are about to lose 5". The number comes from
              * simulating the repair rather than from arithmetic here, so the
              * card cannot promise something the streak would not do.
              */}
            <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
              {offer.cost} puts back <strong style={{ color: 'var(--text-strong)', fontWeight: 700 }}>{dayLabel(offer.at)}</strong>
              {' — '}
              {offer.wouldMake === 1 ? 'a 1 day streak' : `a ${offer.wouldMake} day streak`}.
            </p>

            {affordable ? (
              <Button variant="secondary" onClick={buy} disabled={busy}>
                {busy ? 'Putting it back…' : `Put ${dayLabel(offer.at)} back`}
              </Button>
            ) : (
              /* No disabled button standing there wanting to be pressed, and no
                 progress bar filling toward it. A plain sentence about what is
                 not yet true, which the next session will change. */
              <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-faint)' }}>
                {short} more to do that.
              </p>
            )}
          </div>
        )}

        {points.spent > 0 && (
          <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-faint)' }}>
            {points.spent} spent so far.
          </p>
        )}
      </Card>
    </section>
  );
}
