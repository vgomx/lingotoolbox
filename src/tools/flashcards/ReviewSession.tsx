import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Dialog, Flashcard, Icon, IconButton, ProgressBar, ReviewRating, Tag, Toast, Tooltip, playSound, useIsMobile } from 'lingo-ds';
import { TopRight, useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import { EmptyTool } from '../EmptyTool';
import { NoteCard } from '../grammar/NoteCard';
import { ChainCard } from '../etymology/ChainCard';
import { hasContent, loadEtymology, lookup, type Etymologies } from '../../data/etymology';
import { dueDirections, gradePreview, scheduleOf, sortForSession } from '../../data/scheduler';
import { findIllustration, illustrationUrl } from '../../data/illustrations';
import type { SoundName } from 'lingo-ds';
import type { Grade, ReviewItem } from '../../data/types';

const GRADE_KEYS: Grade[] = ['again', 'hard', 'good', 'easy'];

/** Rising in brightness with the grade. `again` is the softest sound in the set. */
const GRADE_SOUND: Record<Grade, SoundName> = {
  again: 'gradeAgain',
  hard: 'gradeHard',
  good: 'gradeGood',
  easy: 'gradeEasy',
};
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
  const { decks, cards, dueInDeck, prefs, grade, undo, undoDepth, notesFor, language, workspace } = useStore();
  const isMobile = useIsMobile();

  const deck = deckId ? decks.find((d) => d.id === deckId) : undefined;

  /**
   * The queue is captured once when the session starts. Grading mutates card
   * state, so re-deriving it every render would reshuffle mid-session.
   */
  const [queue, setQueue] = React.useState<ReviewItem[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [graded, setGraded] = React.useState(0);
  const [again, setAgain] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [etymOpen, setEtymOpen] = React.useState(false);
  const [etym, setEtym] = React.useState<Etymologies | null>(null);

  React.useEffect(() => {
    if (queue) return;
    const now = Date.now();
    const pool = deckId
      ? dueInDeck(deckId)
      // Across every deck in the workspace: each card contributes the directions
      // it owes, which is one question for most and two for a card asked both
      // ways whose halves have both come due.
      : cards.flatMap((card) => dueDirections(card, now).map((direction) => ({ card, direction })));
    setQueue(sortForSession(pool).slice(0, prefs.sessionLimit));
    // Building a queue always starts a session from the top, so the index can
    // never point past the end of a freshly built one.
    setIndex(0);
    setFlipped(false);
  }, [queue, deckId, cards, dueInDeck, prefs.sessionLimit]);

  const current = queue?.[index];
  const done = !!queue && index >= queue.length;

  /**
   * Which way round this question runs, and what it is made of.
   *
   * Up here rather than beside the render because the key handler needs them
   * too — a shortcut that opens the notes has to know whether there are any.
   */
  const card = current?.card;
  const reverse = current?.direction === 'reverse';
  /**
   * The rules this card touches, matched on the tags it already carries.
   *
   * Offered on both faces on purpose. Looking a rule up before answering is not
   * cheating at anything — the grade is self-reported, so the only person a peek
   * costs is the person taking it, and reading the rule at the moment you needed
   * it is most of how it sticks.
   */
  const notes = card ? notesFor(card) : [];
  /*
   * The word's ancestry, if the workspace has a list and the word is in it.
   *
   * card.front is always the target-language side whichever way round the card
   * is being asked, so this looks the same up in both directions — the English
   * gloss has no etymology worth showing here.
   */
  const chain = card && etym ? lookup(etym, card.front) : null;
  const hasChain = hasContent(chain);

  // The one celebration, and only on the edge into done — not on every render of
  // the completed screen, which a re-render would otherwise replay.
  React.useEffect(() => {
    if (done) playSound('sessionComplete');
  }, [done]);

  /**
   * Walks the session back one answer, alongside the store putting the card back.
   *
   * The card is not enough on its own: a grade also moved the index, cleared the
   * flip and, for Again, pushed a second copy of the question onto the end of
   * the queue. Undoing the schedule while leaving those in place would land you
   * on the next card with the previous one silently restored behind you, and the
   * Again copy would still be waiting at the end for a lapse that no longer
   * happened.
   */
  const stepBack = React.useCallback(async () => {
    const restored = await undo();
    if (!restored) return;

    /**
     * Whether the grade being taken back was Again.
     *
     * Nothing records the grade itself, but Again is the only one that appends
     * a second copy of the question to the end of the queue — so a last entry
     * for this card, sitting beyond the ground already covered, is that copy and
     * nothing else. Decided once, here, rather than inside each setter: two
     * updaters asking the same question of a queue one of them is changing is
     * how they end up disagreeing.
     */
    const last = queue?.[queue.length - 1];
    const wasAgain = !!queue && queue.length > index && last?.card.id === restored.id;

    if (wasAgain) {
      setQueue((q) => (q ? q.slice(0, -1) : q));
      setAgain((n) => Math.max(0, n - 1));
    }
    setIndex((i) => Math.max(0, i - 1));
    setGraded((n) => Math.max(0, n - 1));
    setFlipped(false);
    setToast('Took back the last answer.');
  }, [undo, index, queue]);

  const answer = React.useCallback(async (key: Grade) => {
    if (!current) return;
    // Before the await, so the sound answers the keypress rather than the write.
    playSound(GRADE_SOUND[key]);
    await grade(current.card, current.direction, key);
    setGraded((n) => n + 1);
    if (key === 'again') {
      setAgain((n) => n + 1);
      // A question graded Again comes back at the end of this session rather
      // than in a minute — and only that question, not the card's other one.
      setQueue((q) => (q ? [...q, current] : q));
    }
    setFlipped(false);
    setIndex((i) => i + 1);
  }, [current, grade]);

  // Space/Enter turns the card either way; 1–4 grade a turned one.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Without this, Cmd+1 graded a card on its way to switching browser tab.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if ((e.key === 'e' || e.key === 'E') && hasChain) {
        e.preventDefault();
        setEtymOpen((o) => !o);
        setNotesOpen(false);
        return;
      }
      // G opens the rule and closes it again. Allowed through the gate below,
      // because the key that opened it is the one you reach for to dismiss it.
      if ((e.key === 'g' || e.key === 'G') && notes.length > 0) {
        e.preventDefault();
        setNotesOpen((o) => !o);
        return;
      }
      /*
       * Nothing else while the rule is up.
       *
       * The dialog covers the card, so every shortcut past here would act on
       * something you cannot see — and the first version of this shipped that
       * way: Space flipped the hidden card and 3 graded it, meaning reading the
       * explanation could mark the card you were reading about as known. Escape
       * still closes, since that is the Dialog's own handler, not this one.
       */
      if (notesOpen || etymOpen) return;

      // The shortcut people already have in their fingers for this.
      if ((e.key === 'z' || e.key === 'Z') && graded > 0) {
        e.preventDefault();
        void stepBack();
        return;
      }
      // Turns, rather than only opening. It used to fire only while the card
      // showed its prompt, so once you had the answer the key that got you
      // there did nothing — the card could be turned back by dragging it or by
      // clicking it, but not by the same key that turned it over.
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!flipped) playSound('flip');
        setFlipped(!flipped);
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
  }, [current, flipped, answer, graded, stepBack, notes.length, notesOpen, etymOpen, hasChain]);

  // A note belongs to the card it was opened from; leaving it up over the next
  // one would be answering a different question with the last one's rule.
  React.useEffect(() => { setNotesOpen(false); setEtymOpen(false); }, [index]);

  // Fetched once per language and shared with the Etymology screen.
  React.useEffect(() => {
    let live = true;
    void loadEtymology(language).then((d) => { if (live) setEtym(d); });
    return () => { live = false; };
  }, [language]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const title = deck ? `Review · ${deck.name}` : 'Review';
  // Back to the deck being reviewed when there is one, otherwise to the list.
  useChrome({
    title: deck ? 'Review' : title,
    titleIcon: 'layers',
    parent: deck
      ? { label: deck.name, to: `/app/cards/${deck.id}` }
      : { label: 'Flashcards', to: '/app/cards' },
    sidebar: true,
  });

  if (!queue) {
    return <div style={page} />;
  }

  if (!queue.length) {
    return (
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
    );
  }

  if (done) {
    return (
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
    );
  }

  /**
   * Which way round this question runs.
   *
   * Forward shows the word and asks for the meaning; reverse shows the meaning
   * and asks for the word. The card is the same record either way — only the
   * faces trade places, along with the side the picture sits on: a picture of
   * the answer sitting on the prompt would turn recall into naming a picture.
   */
  const previews = current ? gradePreview(scheduleOf(current.card, current.direction)) : [];
  const grades = GRADE_KEYS.map((key, i) => ({
    key,
    label: GRADE_META[key].label,
    variant: GRADE_META[key].variant,
    shortcut: GRADE_META[key].shortcut,
    due: previews[i]?.due,
  }));

  return (
    <>
      <TopRight>
        {/* Icon-only on a phone: the words cost ~100px of a 375px bar and
            squeezed the title down to "Re…". */}
        {/* Only once there is something to take back, and worded as the thing it
            undoes rather than as the word "undo" — you are putting a card back,
            not reversing a transaction. */}
        {/* Only when there is something to show. A button that opens an empty
            sheet teaches you to stop pressing it. */}
        {notes.length > 0 && (
          <Tooltip label={notes.length === 1 ? notes[0].title : `${notes.length} notes for this card`} shortcut="G">
            <IconButton label="Grammar notes for this card" onClick={() => { setNotesOpen(true); setEtymOpen(false); }}>
              <Icon name="scroll-text" size={18} />
            </IconButton>
          </Tooltip>
        )}
        {/* Same rule as the notes button: only when there is a chain to show. */}
        {hasChain && (
          <Tooltip label="Where this word comes from" shortcut="E">
            <IconButton label="Etymology for this card" onClick={() => { setEtymOpen(true); setNotesOpen(false); }}>
              <Icon name="git-branch" size={18} />
            </IconButton>
          </Tooltip>
        )}
        {undoDepth > 0 && (
          <Tooltip label="Take back the last answer" shortcut="Z">
            <IconButton label="Take back the last answer" onClick={() => void stepBack()}>
              <Icon name="rotate-ccw" size={18} />
            </IconButton>
          </Tooltip>
        )}
        {isMobile ? (
          <IconButton label="End session" onClick={() => navigate(deck ? `/app/cards/${deck.id}` : '/app/cards')}>
            <Icon name="x" size={18} />
          </IconButton>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => navigate(deck ? `/app/cards/${deck.id}` : '/app/cards')}>
            End session
          </Button>
        )}
      </TopRight>
      <div style={page}>
        <ProgressBar
          label="Session"
          valueLabel={`${Math.min(index + 1, queue.length)} / ${queue.length}`}
          value={index}
          max={queue.length}
          color={deck?.accent ?? 'var(--tool-flashcards)'}
        />

        {current && card && (
          <Flashcard
            // The direction is in the key: the same card can be asked both ways
            // in one session, and without it React would reconcile the second
            // question onto the first and keep it turned over.
            key={`${card.id}:${current.direction}:${index}`}
            front={reverse ? card.back : card.front}
            back={reverse ? card.front : card.back}
            // The pronunciation belongs to the word, so it goes wherever the
            // word is — a hint on the prompt when the word is the answer would
            // give it away.
            phonetic={reverse ? undefined : card.phonetic}
            illustration={card.illustration && (
              <img
                src={illustrationUrl(card.illustration)}
                alt={findIllustration(card.illustration)?.name ?? ''}
                width={56}
                height={56}
              />
            )}
            illustrationSide={reverse ? 'front' : 'back'}
            // Which way it is asking, not just which language the deck is. Read
            // "→ Dutch" as "give me the Dutch": without the arrow you cannot
            // tell whether to produce the word or recall the meaning, and you
            // would grade yourself against whichever you happened to think of.
            language={reverse ? `→ ${workspace.name}` : workspace.name}
            flipped={flipped}
            onFlip={(next) => { if (next) playSound('flip'); setFlipped(next); }}
            height={320}
            // --violet-100, not 300: on the violet back face, where the tag's own 18%
            // tint lifts the backdrop further — 300 measured 3.19, 200 still 4.32.
            tags={[
              // On the answer side with the tags, and first. On the prompt it
              // would be a clue: knowing a word is C1 before you try to recall
              // it tells you something about the answer.
              ...(card.level ? [<Tag key="level" color="var(--violet-100)">{card.level}</Tag>] : []),
              ...card.tags.map((t) => <Tag key={t} color="var(--violet-100)">{t}</Tag>),
            ]}
          />
        )}

        {flipped ? (
          <ReviewRating
            grades={grades}
            showShortcuts={prefs.showShortcuts}
            onGrade={(key) => void answer(key as Grade)}
          />
        ) : (
          <Button block size="lg" variant="secondary" sound={false} onClick={() => { playSound('flip'); setFlipped(true); }}>
            Show answer
          </Button>
        )}
      </div>

      <Dialog
        open={etymOpen}
        onClose={() => setEtymOpen(false)}
        title="Where this word comes from"
        description="Close it and carry on — your place is kept."
        width={520}
      >
        <div style={{ paddingBottom: 'var(--space-4)' }}>
          {card && chain && etym && <ChainCard word={card.front} chain={chain} data={etym} compact />}
        </div>
      </Dialog>

      <Dialog
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title={notes.length === 1 ? 'One rule for this card' : 'Rules for this card'}
        description="Close it and carry on — your place is kept."
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', paddingBottom: 'var(--space-4)' }}>
          {notes.map((note) => <NoteCard key={note.id} note={note} />)}
        </div>
      </Dialog>

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 60 }}>
          <Toast title={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </>
  );
}
