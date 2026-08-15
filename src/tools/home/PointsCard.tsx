import * as React from 'react';
import { Button, Card, Icon, ProgressBar, Tooltip, playSound, useIsTouch } from 'lingo-ds';
import * as db from '../../data/db';

/**
 * Points, and the one thing they buy: a streak extension.
 *
 * The balance is not a score. It is the same practice the streak already counts,
 * read a second way — a point a card, five for the day — so nothing new has to
 * be tracked and there is no number that can disagree with the history behind
 * it. See db.points.
 *
 * An extension is held, not applied. It covers a day that goes by unpractised,
 * on its own, because someone who forgot to practise is by definition not there
 * to press anything — see db.settleExtensions. Two is the most that can be held
 * at once, and spending one frees the slot, so points always have somewhere to
 * go and nobody can bank a fortnight of absence.
 *
 * This replaces a retroactive repair that reached back into the calendar and
 * bought a specific missed day. Same intent, wrong moment: it asked people to
 * notice and act, which is the thing that had already gone wrong.
 *
 * The design system's rule is that repair is fine and pressure is not. So the
 * card says what is held and what it would cost to hold another, once, with no
 * countdown, nothing that asks, and no mention of what is about to be lost.
 */

/** What the number is for. Read once, then never again — hence the tooltip. */
const HELP = 'Earned by practising: a point a card, and five for the day.';

/**
 * The slots, drawn.
 *
 * A filled flame for each extension in hand and an empty ring for each slot
 * that is not, so the whole state of the thing is one glance: how many are
 * waiting, and whether there is room for another.
 */
function Slots({ held }: { held: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }} aria-hidden>
      {Array.from({ length: db.EXTENSION_CAP }, (_, i) => {
        const full = i < held;
        return (
          <span
            key={i}
            style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40, flex: 'none',
              borderRadius: 'var(--radius-md)',
              background: full
                ? 'color-mix(in oklab, var(--streak) 20%, var(--surface-card))'
                : 'var(--surface-sunken)',
              boxShadow: full
                ? 'inset 0 0 0 1px color-mix(in oklab, var(--streak) 55%, transparent)'
                : 'var(--ring-inset)',
            }}
          >
            <Icon
              name="flame"
              size={20}
              style={{ color: full ? 'var(--streak)' : 'var(--text-faint)', opacity: full ? 1 : 0.5 }}
            />
          </span>
        );
      })}
    </div>
  );
}

export function PointsCard({ points, onBuy }: {
  points: db.Points;
  onBuy: () => Promise<boolean>;
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

  const room = points.held < db.EXTENSION_CAP;
  const affordable = points.balance >= db.POINTS.extension;

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    const done = await onBuy();
    // The same cue a grade gets. Nothing celebratory: an extension is a day
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
        {/* States what they are for. Not what happens without them. */}
        <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>
          They buy streak extensions.
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Slots held={points.held} />
          {/* The rule, once, beside the thing it is about — and phrased as what
              an extension does rather than as what happens without one. */}
          <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)', minWidth: 0 }}>
            {points.held === 0
              ? `An extension covers a day you miss. Hold up to ${db.EXTENSION_CAP}.`
              : points.held === 1
                ? 'One in hand. It covers the next day you miss.'
                : `${points.held} in hand, covering the next ${points.held} days you miss.`}
          </p>
        </div>

        {room && (affordable ? (
          <Button variant="secondary" onClick={buy} disabled={busy}>
            {busy ? 'Buying…' : `Buy one for ${db.POINTS.extension}`}
          </Button>
        ) : (
          /*
           * The shortfall as a bar rather than a sentence.
           *
           * It fills by practising rather than emptying with time, and it
           * cannot go backwards — which is what makes it a record of what has
           * been done rather than a countdown.
           */
          <ProgressBar
            label="Toward the next one"
            valueLabel={`${points.balance} / ${db.POINTS.extension}`}
            value={points.balance}
            max={db.POINTS.extension}
            color="var(--brand)"
          />
        ))}

        {points.used > 0 && (
          /* What they have done, counted in days rather than in points — "100
             spent" is a number nobody holds in their head. Sits on the bottom
             edge so this card and the streak's finish on the same line. */
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 'var(--fs-13)', color: 'var(--text-faint)',
              marginTop: touch ? undefined : 'auto',
            }}
          >
            <Icon name="flame" size={14} style={{ flex: 'none' }} />
            {points.used === 1 ? '1 day covered so far' : `${points.used} days covered so far`}
          </div>
        )}
      </Card>
    </section>
  );
}
