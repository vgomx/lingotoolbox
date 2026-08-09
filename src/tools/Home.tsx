import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Icon, ProgressBar, StreakPill, Tag, useIsMobile } from 'lingo-ds';
import { useChrome } from '../shell/chrome';
import { useStore } from '../state/store';
import { HAS_ETYMOLOGY } from '../data/etymology';
import { NAV_TOOLS } from '../data/seed';
import horizontalLogo from 'lingo-ds/assets/logo/horizontal-violet.svg';

/**
 * The dashboard, following ui_kits/app/HomeScreen.jsx.
 *
 * Two things in the reference are backed by data this app does not keep, and are
 * substituted rather than faked: "this week" is hours spent there and reviews
 * graded here, since nothing tracks time; and "Browse all tools" is dropped,
 * since there is no all-tools page for it to lead to.
 */

const page: React.CSSProperties = {
  maxWidth: 'var(--content-max, 1120px)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-section, 32px)',
};

const eyebrow: React.CSSProperties = {
  fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)',
  textTransform: 'uppercase', color: 'var(--text-muted)',
};

const stat: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800,
  color: 'var(--text-strong)', lineHeight: 1,
};

const sectionHeading: React.CSSProperties = {
  margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)',
  fontWeight: 800, color: 'var(--text-strong)',
};

/** Heading on the left, the one thing you act on in this section on the right. */
const sectionHead: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
  gap: 'var(--space-5)', flexWrap: 'wrap', marginBottom: 'var(--space-5)',
};

const sectionSub: React.CSSProperties = {
  margin: '4px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)',
  maxWidth: 520, lineHeight: 'var(--lh-relaxed)',
};

const grid3: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 'var(--space-5)',
};

/** Three across at content width, as the kit has it — 240px would fit four and
 *  leave the fifth tool stranded on its own row. */
const toolGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 'var(--space-5)',
};

/** Reviews graded per day for the last week. Today is the last bar. */
function WeekChart({ counts }: { counts: number[] }) {
  const peak = Math.max(1, ...counts);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 34 }} aria-hidden="true">
      {counts.map((n, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            // A day with no reviews still shows a sliver, so the week reads as
            // seven days rather than as a gap in the chart.
            height: `${n === 0 ? 6 : Math.max(12, (n / peak) * 100)}%`,
            background: i === counts.length - 1 && n > 0 ? 'var(--brand)' : 'var(--surface-raised)',
            borderRadius: 3,
            display: 'block',
          }}
        />
      ))}
    </div>
  );
}

export function Home() {
  const isMobile = useIsMobile();
  const { decks, cards, notes, dueCount, streak, weeklyReviews, language, workspace, cardsInDeck, dueInDeck } = useStore();
  const navigate = useNavigate();

  const mastered = cards.filter((c) => c.state === 'review' && c.interval >= 21).length;
  const learning = cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length;
  const fresh = cards.filter((c) => c.state === 'new').length;

  const doneToday = weeklyReviews[weeklyReviews.length - 1] ?? 0;
  const weekTotal = weeklyReviews.reduce((a, b) => a + b, 0);

  /** The decks with the most waiting, so the list leads with what to do next. */
  const topDecks = React.useMemo(
    () => decks
      .map((deck) => ({ deck, due: dueInDeck(deck.id).length, cards: cardsInDeck(deck.id) }))
      .filter((d) => d.cards.length > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 3),
    [decks, dueInDeck, cardsInDeck],
  );

  /**
   * One of your own cards, held steady for the day rather than reshuffling on
   * every render — the point is that it is the same word each time you come back.
   */
  const word = React.useMemo(() => {
    if (!cards.length) return null;
    const d = new Date();
    const dayIndex = Math.floor(d.getTime() / 86_400_000);
    return cards[dayIndex % cards.length];
  }, [cards]);

  /** One rule, chosen the same way and on the same clock as the word above. */
  const rule = React.useMemo(() => {
    if (!notes.length) return null;
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return notes[dayIndex % notes.length];
  }, [notes]);

  const masteryOf = (deckCards: typeof cards) => {
    if (!deckCards.length) return 0;
    return Math.round((deckCards.filter((c) => c.state === 'review' && c.interval >= 21).length / deckCards.length) * 100);
  };

  // No title: the rail already says Home, and the header names the workspace.
  useChrome({ streakInTopBar: false });

  const soon = NAV_TOOLS.filter((t) => !t.released);

  return (
    <div style={page}>
      {/*
        * The workspace, not the review queue.
        *
        * This used to open with "58 due today" in 40px type, which made a
        * Flashcards number the headline for the whole app — and left three
        * buttons of different kinds sitting in a row as though they were
        * peers, when one starts an activity and two are only doors. "Start
        * review" also had nothing to be a review *of* up there; it now lives
        * under the heading that says what it reviews.
        */}
      <header>
        {/*
          * The only place the logo appears inside the app, and only on a phone.
          *
          * A desktop has the rail, which carries the mark permanently; a phone
          * has the dock, which does not — so the app never says its own name
          * anywhere. Home is where that belongs: it is the screen you land on,
          * and the one place a brand mark is not competing with a task.
          *
          * The horizontal lockup rather than the stack, because a header wants
          * width rather than height, and a baked variant rather than -brand,
          * because currentColor has nothing to inherit through an <img>.
          */}
        {isMobile && (
          <img
            src={horizontalLogo}
            alt="Lingo Toolbox"
            style={{ display: 'block', height: 26, width: 'auto', margin: '0 auto var(--space-7)' }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <span style={eyebrow}>Workspace</span>
          {/* Status, not an action. Hidden at zero: "0 days" is a fact nobody
              needs, and the guide is explicit about not nagging about streaks. */}
          {streak > 0 && <StreakPill days={streak} size="sm" />}
        </div>
        <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-40)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.05, letterSpacing: 'var(--ls-tight)' }}>
          {workspace.name}
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-16)', color: 'var(--text-muted)', maxWidth: 520, lineHeight: 'var(--lh-relaxed)' }}>
          {[
            `${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}`,
            `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`,
            notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` : null,
          ].filter(Boolean).join(' · ')}
        </p>
      </header>

      {/* ---- Flashcards, everything it owns in one place ------------------- */}
      <section>
        <div style={sectionHead}>
          <div>
            <h2 style={sectionHeading}>Flashcards</h2>
            <p style={sectionSub}>
              {dueCount
                ? `${dueCount} due across ${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}. Grade each card and the schedule adjusts.`
                : 'Nothing due right now. New cards can be added to any deck.'}
            </p>
          </div>
          {dueCount > 0 && (
            <Button size="lg" iconLeft={<Icon name="play" size={18} />} onClick={() => navigate('/app/review')}>
              Review all decks
            </Button>
          )}
        </div>

        <div style={{ ...grid3, marginBottom: 'var(--space-5)' }}>
          <Card>
            <span style={eyebrow}>Due today</span>
            <span style={stat}>{dueCount}</span>
            <ProgressBar
              label="Session progress"
              valueLabel={`${doneToday} done`}
              value={doneToday}
              max={Math.max(1, doneToday + dueCount)}
            />
          </Card>

          <Card>
            <span style={eyebrow}>Words mastered</span>
            <span style={stat}>{mastered.toLocaleString()}</span>
            <ProgressBar
              label="Mastery mix"
              value={0}
              segments={cards.length ? [
                { weight: mastered || 0.001, color: 'var(--success)' },
                { weight: learning || 0.001, color: 'var(--warning)' },
                { weight: fresh || 0.001, color: 'var(--surface-raised)' },
              ] : undefined}
            />
          </Card>

          <Card>
            <span style={eyebrow}>This week</span>
            <span style={stat}>{weekTotal}</span>
            <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>
              {weekTotal === 1 ? 'review' : 'reviews'}
            </span>
            <WeekChart counts={weeklyReviews} />
          </Card>
        </div>

        {topDecks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {topDecks.map(({ deck, due, cards: deckCards }) => (
              <Link key={deck.id} to={due > 0 ? `/app/review/${deck.id}` : `/app/cards/${deck.id}`} style={{ textDecoration: 'none' }}>
                <Card accent={deck.accent} interactive padding="16px">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)' }}>
                          {deck.name}
                        </span>
                        {due > 0 && <Badge tone="warning">{due} due</Badge>}
                      </div>
                      <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
                        {deckCards.length} cards · {masteryOf(deckCards)}% mastered
                      </span>
                    </div>
                    {!isMobile && (
                      <div style={{ width: 120, flex: 'none' }}>
                        <ProgressBar value={masteryOf(deckCards)} height={6} color={deck.accent} />
                      </div>
                    )}
                    <Icon name="chevron-right" size={18} style={{ color: 'var(--text-faint)' }} />
                  </div>
                </Card>
              </Link>
            ))}
            <Link to="/app/cards" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
              <Button variant="ghost" size="sm" iconLeft={<Icon name="layers" size={15} />}>
                All decks
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* ---- The other two, side by side and clearly their own ------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-5)', alignItems: 'start' }}>
        {HAS_ETYMOLOGY[language] && word && (
          <section>
            <div style={sectionHead}>
              <div>
                <h2 style={sectionHeading}>Etymology</h2>
                <p style={sectionSub}>Where a word came from, and what it is related to.</p>
              </div>
            </div>
            <Card accent="var(--tool-etymology)">
              <span style={eyebrow}>Word of the day</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.05 }}>
                {word.front}
              </span>
              {word.phonetic && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>{word.phonetic}</span>
              )}
              <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-body)', lineHeight: 'var(--lh-relaxed)' }}>
                {word.back}
              </p>
              {/* Offered without checking first: the word list is megabytes and
                  is not worth fetching here to decide whether to draw a button,
                  so the details screen says plainly when Wiktionary has nothing
                  rather than this pretending it always will. */}
              <Link to={`/app/etymology/${encodeURIComponent(word.front)}`} style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm" block iconLeft={<Icon name="git-branch" size={14} />}>
                  Where it comes from
                </Button>
              </Link>
              <Link to="/app/etymology" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="sm" block>Trace another word</Button>
              </Link>
            </Card>
          </section>
        )}

        {rule && (
          <section>
            <div style={sectionHead}>
              <div>
                <h2 style={sectionHeading}>Grammar</h2>
                <p style={sectionSub}>Short rules, tagged the way your cards are.</p>
              </div>
            </div>
            <Card accent="var(--tool-grammar)">
              <span style={eyebrow}>A rule worth knowing</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.2 }}>
                {rule.title}
              </span>
              {/* The first paragraph only. A note runs to a few hundred words
                  and the home screen is not where you read it. */}
              <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-body)', lineHeight: 'var(--lh-relaxed)' }}>
                {rule.body.split('\n\n')[0]}
              </p>
              {rule.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {rule.tags.map((t) => <Tag key={t} color="var(--tool-grammar)">{t}</Tag>)}
                </div>
              )}
              <Link to="/app/grammar" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm" block iconLeft={<Icon name="scroll-text" size={14} />}>
                  All notes
                </Button>
              </Link>
            </Card>
          </section>
        )}
      </div>

      {/* ---- What is not built yet, said once ------------------------------ */}
      {soon.length > 0 && (
        <section>
          <div style={sectionHead}>
            <div>
              <h2 style={sectionHeading}>Still to come</h2>
              <p style={sectionSub}>Designed, not built. They are in the rail so you know they are coming.</p>
            </div>
          </div>
          <div style={toolGrid}>
            {soon.map((t) => (
              <Card key={t.id}>
                <span
                  style={{
                    width: 38, height: 38, borderRadius: 'var(--radius-md)', display: 'grid', placeItems: 'center',
                    background: `color-mix(in oklab, ${t.accent} 18%, transparent)`, color: t.accent,
                  }}
                >
                  <Icon name={t.icon} size={20} />
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 'var(--fs-16)', fontWeight: 800, color: 'var(--text-strong)' }}>
                  {t.label}
                  <Badge tone="neutral">Soon</Badge>
                </span>
                <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>{t.blurb}</span>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
