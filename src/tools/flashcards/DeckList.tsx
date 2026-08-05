import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Icon, ProgressBar, Tag } from 'lingo-ds';
import { AppShell } from '../../shell/AppShell';
import { useStore } from '../../state/store';
import { EmptyTool } from '../EmptyTool';

const page: React.CSSProperties = {
  maxWidth: 'var(--content-max, 1120px)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
};

export function DeckList() {
  const { decks, cardsInDeck, dueInDeck, dueCount, workspace } = useStore();
  const navigate = useNavigate();

  const totalCards = decks.reduce((n, d) => n + cardsInDeck(d.id).length, 0);

  return (
    <AppShell
      title="Flashcards"
      titleIcon="layers"
      topRight={
        dueCount > 0 ? (
          <Button
            size="sm"
            iconLeft={<Icon name="play" size={15} />}
            onClick={() => navigate('/app/review')}
          >
            Start review
          </Button>
        ) : undefined
      }
    >
      <div style={page}>
        <header style={{ marginBottom: 'var(--space-8)' }}>
          <span
            style={{
              fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)',
              textTransform: 'uppercase', color: 'var(--text-muted)',
            }}
          >
            {workspace.name} · {decks.length} {decks.length === 1 ? 'deck' : 'decks'} · {totalCards} cards
          </span>
          <h1
            style={{
              margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)',
              fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15,
            }}
          >
            {dueCount ? `${dueCount} due today` : 'Nothing due today'}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)', maxWidth: 520, lineHeight: 'var(--lh-relaxed)' }}>
            {dueCount
              ? 'Grade each card and the schedule adjusts. Sessions end when you are done.'
              : 'Every card is scheduled ahead. Add cards to a deck, or come back tomorrow.'}
          </p>
        </header>

        {decks.length === 0 ? (
          <EmptyTool
            icon="layers"
            accent="var(--tool-flashcards)"
            title="No decks yet"
            description="A deck holds the words you are practising. Add one from the plus in the sidebar."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
            {decks.map((deck) => {
              const cards = cardsInDeck(deck.id);
              const due = dueInDeck(deck.id).length;
              const mastered = cards.filter((c) => c.state === 'review' && c.interval >= 21).length;
              const learning = cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length;
              const fresh = cards.filter((c) => c.state === 'new').length;

              return (
                <Link key={deck.id} to={`/app/cards/${deck.id}`} style={{ textDecoration: 'none' }}>
                  <Card
                    interactive
                    accent={deck.accent}
                    title={deck.name}
                    subtitle={`${cards.length} cards · ${due} due`}
                    actions={due > 0 ? <Badge tone="danger">{due}</Badge> : undefined}
                    style={{ height: '100%' }}
                  >
                    <ProgressBar
                      label="Mastery"
                      valueLabel={cards.length ? `${Math.round((mastered / cards.length) * 100)}%` : '—'}
                      segments={cards.length ? [
                        { weight: mastered || 0.001, color: 'var(--success)' },
                        { weight: learning || 0.001, color: 'var(--warning)' },
                        { weight: fresh || 0.001, color: 'var(--surface-raised)' },
                      ] : undefined}
                      value={0}
                    />
                    {deck.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {deck.tags.map((t) => <Tag key={t} color={deck.accent}>{t}</Tag>)}
                      </div>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
