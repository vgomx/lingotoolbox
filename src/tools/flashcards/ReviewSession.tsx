import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Flashcard, Icon, ProgressBar, ReviewRating, Tag, Toast } from 'lingo-ds';
import { AppShell } from '../../shell/AppShell';
import { useStore } from '../../state/store';
import { EmptyTool } from '../EmptyTool';
import { gradePreview, sortForSession } from '../../data/scheduler';
import type { Card as CardModel, Grade } from '../../data/types';

const GRADE_KEYS: Grade[] = ['again', 'hard', 'good', 'easy'];
const GRADE_META: Record<Grade, { label: string; variant: 'danger' | 'secondary' | 'success' | 'primary'; shortcut: string }> = {
  again: { label: 'Again', variant: 'danger', shortcut: '1' },
  hard: { label: 'Hard', variant: 'secondary', shortcut: '2' },
  good: { label: 'Good', variant: 'success', shortcut: '3' },
  easy: { label: 'Easy', variant: 'primary', shortcut: '4' },
};

const page: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-7)',
};

export function ReviewSession() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { decks, cards, dueInDeck, prefs, grade, workspace } = useStore();

  const deck = deckId ? decks.find((d) => d.id === deckId) : undefined;

  /**
   * The queue is captured once when the session starts. Grading mutates card
   * state, so re-deriving it every render would reshuffle mid-session.
   */
  const [queue, setQueue] = React.useState<CardModel[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [graded, setGraded] = React.useState(0);
  const [again, setAgain] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (queue) return;
    const pool = deckId
      ? dueInDeck(deckId)
      : cards.filter((c) => c.due <= Date.now());
    setQueue(sortForSession(pool).slice(0, prefs.sessionLimit));
    // Building a queue always starts a session from the top, so the index can
    // never point past the end of a freshly built one.
    setIndex(0);
    setFlipped(false);
  }, [queue, deckId, cards, dueInDeck, prefs.sessionLimit]);

  const current = queue?.[index];
  const done = !!queue && index >= queue.length;

  const answer = React.useCallback(async (key: Grade) => {
    if (!current) return;
    await grade(current, key);
    setGraded((n) => n + 1);
    if (key === 'again') {
      setAgain((n) => n + 1);
      // A card graded Again comes back at the end of this session, not in a minute.
      setQueue((q) => (q ? [...q, current] : q));
    }
    setFlipped(false);
    setIndex((i) => i + 1);
  }, [current, grade]);

  // Space/Enter flips; 1–4 grade a flipped card.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Without this, Cmd+1 graded a card on its way to switching browser tab.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flipped) {
        const i = ['1', '2', '3', '4'].indexOf(e.key);
        if (i >= 0) {
          e.preventDefault();
          void answer(GRADE_KEYS[i]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, flipped, answer]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const title = deck ? `Review · ${deck.name}` : 'Review';

  if (!queue) {
    return <AppShell title={title} titleIcon="layers"><div style={page} /></AppShell>;
  }

  if (!queue.length) {
    return (
      <AppShell title={title} titleIcon="layers">
        <EmptyTool
          icon="circle-check"
          accent="var(--success)"
          title="Nothing due"
          description={deck
            ? 'Every card in this deck is scheduled ahead. Come back when one is due.'
            : `Every ${workspace.name} card is scheduled ahead. Come back when one is due.`}
          action={
            <Link to={deck ? `/app/cards/${deck.id}` : '/app/cards'} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Back to {deck ? 'deck' : 'decks'}</Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell title={title} titleIcon="layers">
        <div style={page}>
          <EmptyTool
            icon="circle-check"
            accent="var(--success)"
            title="Session complete"
            description={`${graded} ${graded === 1 ? 'card' : 'cards'} graded${again ? `, ${again} coming back sooner` : ''}. Everything else is scheduled.`}
            action={
              <div style={{ display: 'flex', gap: 'var(--gap-inline)' }}>
                <Link to={deck ? `/app/cards/${deck.id}` : '/app/cards'} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">Back to {deck ? 'deck' : 'decks'}</Button>
                </Link>
                <Button
                  onClick={() => { setQueue(null); setIndex(0); setGraded(0); setAgain(0); setFlipped(false); }}
                  iconLeft={<Icon name="rotate-ccw" size={16} />}
                >
                  Review again
                </Button>
              </div>
            }
          />
        </div>
      </AppShell>
    );
  }

  const previews = current ? gradePreview(current) : [];
  const grades = GRADE_KEYS.map((key, i) => ({
    key,
    label: GRADE_META[key].label,
    variant: GRADE_META[key].variant,
    shortcut: GRADE_META[key].shortcut,
    due: previews[i]?.due,
  }));

  return (
    <AppShell
      title={title}
      titleIcon="layers"
      topRight={
        <Button variant="ghost" size="sm" onClick={() => navigate(deck ? `/app/cards/${deck.id}` : '/app/cards')}>
          End session
        </Button>
      }
    >
      <div style={page}>
        <ProgressBar
          label="Session"
          valueLabel={`${Math.min(index + 1, queue.length)} / ${queue.length}`}
          value={index}
          max={queue.length}
          color={deck?.accent ?? 'var(--tool-flashcards)'}
        />

        {current && (
          <Flashcard
            key={current.id + index}
            front={current.front}
            back={current.back}
            phonetic={current.phonetic}
            language={workspace.name}
            flipped={flipped}
            onFlip={setFlipped}
            height={320}
            hint={flipped ? undefined : 'Click or press Space to flip'}
            tags={current.tags.map((t) => <Tag key={t} color="var(--violet-300)">{t}</Tag>)}
          />
        )}

        {flipped ? (
          <ReviewRating
            grades={grades}
            showShortcuts={prefs.showShortcuts}
            onGrade={(key) => void answer(key as Grade)}
          />
        ) : (
          <Button block size="lg" variant="secondary" onClick={() => setFlipped(true)}>
            Show answer
          </Button>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 60 }}>
          <Toast title={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </AppShell>
  );
}
