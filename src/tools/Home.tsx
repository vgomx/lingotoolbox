import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Icon, ProgressBar } from 'lingo-ds';
import { AppShell } from '../shell/AppShell';
import { useStore } from '../state/store';
import { TOOLS } from '../data/seed';

const page: React.CSSProperties = {
  maxWidth: 'var(--content-max, 1120px)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
};

const statCard: React.CSSProperties = { flex: 1, minWidth: 180 };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={statCard} padding="16px 18px">
      <span style={{ fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.1 }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>{sub}</span>}
    </Card>
  );
}

export function Home() {
  const { decks, cards, dueCount, streak, workspace } = useStore();
  const navigate = useNavigate();

  const mastered = cards.filter((c) => c.state === 'review' && c.interval >= 21).length;
  const learning = cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length;
  const fresh = cards.filter((c) => c.state === 'new').length;

  const topDeck = React.useMemo(
    () => decks
      .map((d) => ({ deck: d, due: cards.filter((c) => c.deckId === d.id && c.due <= Date.now()).length }))
      .sort((a, b) => b.due - a.due)[0],
    [decks, cards],
  );

  return (
    <AppShell
      topRight={dueCount > 0 ? (
        <Button size="sm" iconLeft={<Icon name="play" size={15} />} onClick={() => navigate('/app/review')}>
          Start review
        </Button>
      ) : undefined}
    >
      <div style={page}>
        <header style={{ marginBottom: 'var(--space-8)' }}>
          <span style={{ fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            {workspace.name} workspace
          </span>
          <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-40)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.1, letterSpacing: 'var(--ls-tight)' }}>
            {dueCount ? `${dueCount} due today` : 'All caught up'}
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 'var(--fs-15)', color: 'var(--text-muted)', maxWidth: 520, lineHeight: 'var(--lh-relaxed)' }}>
            {dueCount
              ? `Across ${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}. Grade each card and the schedule adjusts.`
              : 'Nothing is due. Add cards to a deck, or come back tomorrow.'}
          </p>
        </header>

        <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap', marginBottom: 'var(--space-8)' }}>
          <Stat label="Due today" value={String(dueCount)} sub={`${cards.length} cards total`} />
          <Stat label="Streak" value={String(streak)} sub={streak === 1 ? 'day' : 'days'} />
          <Stat label="Mastered" value={String(mastered)} sub="scheduled 3 weeks out or more" />
        </div>

        {cards.length > 0 && (
          <Card title="Mastery mix" subtitle={`${cards.length} cards`} style={{ marginBottom: 'var(--space-8)' }}>
            <ProgressBar
              height={10}
              value={0}
              segments={[
                { weight: mastered || 0.001, color: 'var(--success)' },
                { weight: learning || 0.001, color: 'var(--warning)' },
                { weight: fresh || 0.001, color: 'var(--surface-raised)' },
              ]}
            />
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>
              <span>{mastered} mastered</span>
              <span>{learning} learning</span>
              <span>{fresh} new</span>
            </div>
          </Card>
        )}

        <h2 style={{ margin: '0 0 var(--space-6)', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)', fontWeight: 800, color: 'var(--text-strong)' }}>
          Your toolbox
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
          {TOOLS.filter((t) => t.id !== 'home').map((t) => (
            <Link key={t.id} to={`/app/${t.path}`} style={{ textDecoration: 'none' }}>
              <Card interactive accent={t.accent} style={{ height: '100%' }}>
                <span style={{ color: t.accent, display: 'grid', width: 28 }}>
                  <Icon name={t.icon} size={26} />
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)' }}>
                  {t.label}
                </span>
                <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
                  {t.released
                    ? `${dueCount} due · ${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}`
                    : 'Designed, not built yet'}
                </span>
              </Card>
            </Link>
          ))}
        </div>

        {topDeck && topDeck.due > 0 && (
          <>
            <h2 style={{ margin: 'var(--space-9) 0 var(--space-6)', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)', fontWeight: 800, color: 'var(--text-strong)' }}>
              Pick up where you left off
            </h2>
            <Link to={`/app/review/${topDeck.deck.id}`} style={{ textDecoration: 'none' }}>
              <Card interactive accent={topDeck.deck.accent} title={topDeck.deck.name} subtitle={`${topDeck.due} due`}>
                <Button size="sm" variant="secondary" iconLeft={<Icon name="play" size={14} />}>Start review</Button>
              </Card>
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}
