import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Icon, ProgressBar, StreakPill, Tag, useIsMobile } from 'lingo-ds';
import { useChrome } from '../shell/chrome';
import { useStore } from '../state/store';
import { HAS_ETYMOLOGY } from '../data/etymology';
import { NAV_TOOLS } from '../data/seed';

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
  const wordDeck = word ? decks.find((d) => d.id === word.deckId) : undefined;

  /** One rule, chosen the same way and on the same clock as the word above. */
  const rule = React.useMemo(() => {
    if (!notes.length) return null;
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return notes[dayIndex % notes.length];
  }, [notes]);

  const toolSubtitle = (id: string): string | null => {
    if (id === 'cards') return `${dueCount} due · ${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}`;
    if (id === 'grammar') return notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` : null;
    return null;
  };

  const masteryOf = (deckCards: typeof cards) => {
    if (!deckCards.length) return 0;
    return Math.round((deckCards.filter((c) => c.state === 'review' && c.interval >= 21).length / deckCards.length) * 100);
  };

  // No title: the rail already says Home, and the hero names the workspace.
  useChrome({ streakInTopBar: false });

  return (
    <>
      <div style={page}>
        {/* Heading left, the two things you act on right — as in the kit, rather
            than pushing both into the top bar. */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
          <div>
            {/* The streak sits with the other context rather than beside the CTA.
                It is status, not an action, and pairing them made two very
                differently weighted things compete for the same corner. Hidden at
                zero — "0 days" is a fact nobody needs, and the guide is explicit
                about not nagging about streaks. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <span style={eyebrow}>{workspace.name} workspace</span>
              {streak > 0 && <StreakPill days={streak} size="sm" />}
            </div>
            <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-40)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.05, letterSpacing: 'var(--ls-tight)' }}>
              {dueCount ? `${dueCount} due today` : 'All caught up'}
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-16)', color: 'var(--text-muted)', maxWidth: 460, lineHeight: 'var(--lh-relaxed)' }}>
              {dueCount
                ? `Across ${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}. Grade each card and the schedule adjusts.`
                : 'Nothing is due. Add cards to a deck, or come back tomorrow.'}
            </p>
          </div>
          {dueCount > 0 && (
            <div style={{ flex: 'none' }}>
              <Button size="xl" iconLeft={<Icon name="play" size={18} />} onClick={() => navigate('/app/review')}>
                Start review
              </Button>
            </div>
          )}
        </div>

        <div style={grid3}>
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

        <div>
          <h2 style={{ ...sectionHeading, marginBottom: 'var(--space-5)' }}>Your toolbox</h2>
          <div style={toolGrid}>
            {NAV_TOOLS.filter((t) => t.id !== 'home').map((t) => (
              <Link key={t.id} to={`/app/${t.path}`} style={{ textDecoration: 'none' }}>
                <Card interactive style={{ height: '100%' }}>
                  {/* Icon in a tinted well of its own accent, as the kit has it —
                      the accent identifies the tool without a full-width stripe. */}
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
                    {!t.released && <Badge tone="neutral">Soon</Badge>}
                  </span>
                  {/* Each tool counts its own things. This used to print
                      Flashcards' figures under every card, which was harmless
                      while Flashcards was the only built tool and became wrong
                      the moment it wasn't — Grammar Notes announcing "12 due ·
                      2 decks" is a number about somebody else's screen.
                      Etymology has no cheap count: the word list is a couple of
                      megabytes and fetching it to put a figure on the home
                      screen would be paying for the tool you did not open. */}
                  <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
                    {toolSubtitle(t.id) ?? t.blurb}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Stacked on a phone. A 1.4fr/1fr split of 375px is two ~170px columns,
            which broke "Everyday phrases" onto three lines and clipped the word
            of the day mid-word. */}
        {(topDecks.length > 0 || word || rule) && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
            {topDecks.length > 0 && (
              <div>
                <h2 style={{ ...sectionHeading, marginBottom: 'var(--space-5)' }}>Pick up where you left off</h2>
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
                          <div style={{ width: 120, flex: 'none' }}>
                            <ProgressBar value={masteryOf(deckCards)} height={6} color={deck.accent} />
                          </div>
                          <Icon name="chevron-right" size={18} style={{ color: 'var(--text-faint)' }} />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* The heading belongs to the column, not inside the card. With the
                title on the card, the card had to start level with the heading
                beside it and so sat 45px above the deck cards it is paired with,
                reading as though it belonged to a different row. */}
            {word && (
            <div>
              <h2 style={{ ...sectionHeading, marginBottom: 'var(--space-5)' }}>Word of the day</h2>
              <Card accent="var(--tool-etymology)">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.05 }}>
                  {word.front}
                </span>
                {word.phonetic && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>{word.phonetic}</span>
                )}
                <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-body)', lineHeight: 'var(--lh-relaxed)' }}>
                  {word.back}
                </p>
                {word.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {word.tags.map((t) => <Tag key={t} color="var(--tool-etymology)">{t}</Tag>)}
                  </div>
                )}
                {/* Two ways on from the same word, which is the point of
                    having more than one tool: the deck it lives in, and where
                    it came from. The origin link is offered without checking
                    first — the word list is megabytes and is not worth
                    fetching here to decide whether to show a button — so the
                    details screen says plainly when Wiktionary has no entry
                    rather than this pretending it always will. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {wordDeck && (
                    <Link to={`/app/cards/${wordDeck.id}`} style={{ textDecoration: 'none' }}>
                      <Button variant="secondary" size="sm" block iconLeft={<Icon name="layers" size={14} />}>
                        Open {wordDeck.name}
                      </Button>
                    </Link>
                  )}
                  {HAS_ETYMOLOGY[language] && (
                    <Link to={`/app/etymology/${encodeURIComponent(word.front)}`} style={{ textDecoration: 'none' }}>
                      <Button variant="ghost" size="sm" block iconLeft={<Icon name="git-branch" size={14} />}>
                        Where it comes from
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>

              {rule && (
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <h2 style={{ ...sectionHeading, marginBottom: 'var(--space-5)' }}>A rule worth knowing</h2>
                  <Card accent="var(--tool-grammar)">
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.2 }}>
                      {rule.title}
                    </span>
                    {/* The first paragraph only. A note runs to a few hundred
                        words and the home screen is not where you read it. */}
                    <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-body)', lineHeight: 'var(--lh-relaxed)' }}>
                      {rule.body.split('\n\n')[0]}
                    </p>
                    <Link to="/app/grammar" style={{ textDecoration: 'none' }}>
                      <Button variant="ghost" size="sm" block iconLeft={<Icon name="scroll-text" size={14} />}>
                        All notes
                      </Button>
                    </Link>
                  </Card>
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
