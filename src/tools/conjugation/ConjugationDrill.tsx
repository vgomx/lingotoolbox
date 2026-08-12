import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Icon, Input, Tabs, Tag, playSound, usePrefersReducedMotion } from 'lingo-ds';
import { useChrome } from '../../shell/chrome';
import { DOCK_HEIGHT } from '../../shell/Dock';
import { useStore } from '../../state/store';
import { EmptyTool } from '../EmptyTool';
import {
  HAS_CONJUGATION, cellName, groupsOf, loadConjugation, mark,
  type Conjugations, type Verdict,
} from '../../data/conjugation';
import type { LanguageCode } from '../../data/types';

const page: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
};

const ACCENT = 'var(--tool-conjugation)';

/** How the reader answers. Their choice, kept between sessions. */
type Mode = 'type' | 'choose';
const MODE_KEY = 'lingo-toolbox:drill-mode';
const GROUP_KEY = 'lingo-toolbox:drill-groups';

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};
const save = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

interface Question { word: string; gloss?: string; cell: string; answer: string; options: string[] }

/**
 * Picks the next question.
 *
 * Weighted toward what the reader has been getting wrong, which is the whole
 * promise of the tool — a drill that asked uniformly would spend most of its
 * time on the cells they already know. A miss counts for three tries and decays
 * as it is answered correctly, so a verb does not follow you around forever
 * after one slip.
 */
function pick(
  data: Conjugations,
  groups: Set<string>,
  language: Parameters<typeof cellName>[0],
  misses: Record<string, number>,
  avoid: string | null,
): Question | null {
  const cells = data.cells.filter((c) => groups.has(cellName(language, c).group));
  if (!cells.length) return null;

  const words = Object.keys(data.words);
  const pool: { word: string; cell: string; weight: number }[] = [];
  for (const word of words) {
    const table = data.words[word].c;
    for (const cell of cells) {
      if (!table[cell]) continue;
      const id = `${word}|${cell}`;
      if (id === avoid) continue;
      pool.push({ word, cell, weight: 1 + (misses[id] ?? 0) * 3 });
    }
  }
  if (!pool.length) return null;

  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  const chosen = pool.find((p) => (r -= p.weight) <= 0) ?? pool[pool.length - 1];

  const table = data.words[chosen.word].c;
  const answer = table[chosen.cell];

  /*
   * Distractors from the same verb's other cells.
   *
   * Forms of other verbs would be trivially wrong — the stem gives them away —
   * and the mistake this drill is about is reaching for the wrong cell of the
   * right verb. Falls back to other verbs' forms only when a verb has too few
   * distinct forms of its own, which happens in Dutch where several cells share
   * a spelling.
   */
  const siblings = [...new Set(Object.values(table))].filter((f) => f !== answer);
  const options = [answer];
  while (options.length < 4 && siblings.length) {
    options.push(siblings.splice(Math.floor(Math.random() * siblings.length), 1)[0]);
  }
  while (options.length < 4) {
    const other = data.words[words[Math.floor(Math.random() * words.length)]].c[chosen.cell];
    if (other && !options.includes(other)) options.push(other);
    else break;
  }
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { word: chosen.word, gloss: data.words[chosen.word].g, cell: chosen.cell, answer, options };
}

/*
 * Entrances, as keyframes rather than script.
 *
 * Several small things arrive at the same moment when an answer lands — the
 * verdict, the button, the revealed form — and each is a fresh mount, so a
 * class does what a ref and an effect would do with less machinery. The card
 * swap below is the exception: it animates between two measured heights, which
 * keyframes cannot know. Reduced motion is honoured here rather than through
 * the hook, so it holds even where the hook is not consulted.
 */
const MOTION = `
@keyframes drill-pop { from { opacity: 0; transform: translateY(10px) scale(.86) } to { opacity: 1; transform: none } }
@keyframes drill-rise { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
.drill-pop { animation: drill-pop 380ms var(--ease-spring) backwards }
.drill-rise { animation: drill-rise var(--dur-slow) var(--ease-out) backwards }
@media (prefers-reduced-motion: reduce) { .drill-pop, .drill-rise { animation: none } }
`;

/** How deep the green button's edge sits. A little past the DS chunk — this one is a toy. */
const CHUNK = 4;

/**
 * The row's reserved height: the tallest the button gets, plus its edge.
 *
 * `md` is 36 at rest and grows to the 44 touch floor on a phone, so the row
 * holds 44 either way rather than changing height with the input device.
 */
const SLOT = 44 + CHUNK;

/**
 * The thing you hit to move on.
 *
 * Big, green and outside the card, because it is not part of the question — the
 * question is over. It is the same slot whatever the answer was, so the hand
 * learns one place to go, but only a right answer gets the toy: a deep edge
 * that sinks under the press, and a pop with overshoot on the way in. Getting
 * it wrong is acknowledged, not celebrated, so that one is a quiet secondary.
 *
 * The press is handled here rather than left to the Button because the deeper
 * edge has to sink with it — the DS's own press shadow is sized to its 3px
 * chunk, and a 6px edge that stays put while the face moves reads as the whole
 * button sliding rather than being pushed in.
 */
function ContinueButton({ verdict, onClick }: { verdict: Verdict; onClick: () => void }) {
  // Button is a function component and does not forward a ref, so the control
  // is reached through a wrapper that leaves no box of its own.
  const slot = React.useRef<HTMLSpanElement>(null);
  const [press, setPress] = React.useState(false);
  const won = verdict !== 'wrong';

  React.useEffect(() => {
    const el = slot.current?.querySelector('button');
    if (!el) return;
    // Both answer paths disable the control that was focused — the field, or
    // the option that was picked — so focus would otherwise fall to the body.
    el.focus({ preventScroll: true });
    /*
     * On a phone the card fills the screen and this arrives under the fold, so
     * the one thing to do next would be the one thing you cannot see.
     *
     * The margin is what makes it work: the dock is fixed, so the scroller's
     * own viewport runs on behind it and a button sitting under the dock counts
     * as visible. Holding the dock's height clear puts it back on screen.
     */
    el.style.scrollMarginBottom = `calc(${DOCK_HEIGHT}px + var(--dock-inset) + var(--space-5))`;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const wrap = (node: React.ReactNode) => (
    <span ref={slot} style={{ display: 'contents' }}>{node}</span>
  );

  if (!won) {
    return wrap(
      <Button className="drill-rise" size="md" variant="secondary" onClick={onClick}>
        Got it
      </Button>,
    );
  }

  // Darkened from the theme's own green rather than pinned to a palette step,
  // so the edge stays under the face in light mode, where --success is the
  // darker mint and a fixed mid-tone would light the button from below.
  const edge = 'color-mix(in oklab, var(--success) 58%, #000)';
  return wrap(
    <Button
      className="drill-pop"
      size="md"
      pill
      variant="success"
      iconRight={<Icon name="arrow-right" size={16} />}
      onClick={onClick}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      onPointerLeave={() => setPress(false)}
      onPointerCancel={() => setPress(false)}
      style={{
        // A shade wider than the size's own 16, because a pill's rounded ends
        // eat into the space the label reads in.
        paddingLeft: 22,
        paddingRight: 18,
        boxShadow: `0 ${press ? 1 : CHUNK}px 0 ${edge}`,
        transform: press ? `translateY(${CHUNK - 1}px)` : 'none',
        transition: 'box-shadow var(--dur-instant) var(--ease-standard), transform var(--dur-instant) var(--ease-standard), background-color var(--dur-fast) var(--ease-standard)',
      }}
    >
      Continue
    </Button>,
  );
}

/** Everything the card shows. Split out so the outgoing one can be held still while it leaves. */
interface CardProps {
  language: LanguageCode;
  question: Question;
  mode: Mode;
  verdict: Verdict | null;
  typed: string;
  score: { right: number; asked: number };
  formRef?: React.RefObject<HTMLFormElement>;
  onTyped?: (v: string) => void;
  onCheck?: () => void;
  onPick?: (option: string) => void;
}

function QuestionCard({
  language, question, mode, verdict, typed, score, formRef, onTyped, onCheck, onPick,
}: CardProps) {
  const name = cellName(language, question.cell);

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-28)', fontWeight: 800, color: 'var(--text-strong)' }}>
            {question.word}
          </span>
          {/* A real space, not the margin: margin is layout, and without
              this the verb and its gloss come out of textContent as
              "besprekento discuss" — which is what a screen reader says. */}
          {question.gloss && ' '}
          {question.gloss && (
            <span style={{ marginLeft: 6, fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>{question.gloss}</span>
          )}
        </div>
        <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
          {score.right}/{score.asked}
        </span>
      </div>

      {/* The prompt: who is speaking, and in what. A pronoun rather than
          "first person singular", because that is how the form is reached
          when speaking. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)', fontWeight: 800, color: ACCENT }}>
          {name.pronoun}
        </span>
        <span style={{ fontSize: 'var(--fs-13)', fontWeight: 700, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {name.tense}
        </span>
      </div>

      {mode === 'type' ? (
        <form
          ref={formRef}
          onSubmit={(e) => { e.preventDefault(); if (!verdict) onCheck?.(); }}
          style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Input
              value={typed}
              onChange={(e) => onTyped?.(e.target.value)}
              placeholder={`${name.pronoun}…`}
              disabled={!!verdict}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {/* Stays "Check" once answered rather than turning into Next: moving
              on now has its own button, and a control that changes job under
              the cursor is how a reader ends up skipping the answer they were
              about to read. */}
          <Button type="submit" disabled={!!verdict} style={{ flex: 'none' }}>Check</Button>
        </form>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
          {question.options.map((opt) => {
            const isAnswer = opt === question.answer;
            const chosen = verdict !== null && typed === opt;
            return (
              <Button
                key={opt}
                variant={verdict && isAnswer ? 'primary' : 'secondary'}
                block
                disabled={!!verdict && !isAnswer && !chosen}
                onClick={() => onPick?.(opt)}
              >
                {opt}
              </Button>
            );
          })}
        </div>
      )}

      {verdict && (
        <span
          className="drill-rise"
          style={{
            fontSize: 'var(--fs-15)', fontWeight: 700,
            color: verdict === 'right' ? 'var(--success)' : verdict === 'accents' ? 'var(--warning)' : 'var(--danger)',
          }}
        >
          {verdict === 'right' && 'Right.'}
          {/* Its own verdict: the reader knew the form and missed the
              diacritic, and in Spanish that is the difference between
              "I speak" and "he spoke" — worth saying, not worth failing. */}
          {verdict === 'accents' && `Right, but it is ${question.answer} — mind the accent.`}
          {verdict === 'wrong' && `It is ${question.answer}.`}
        </span>
      )}
    </Card>
  );
}

export function ConjugationDrill() {
  const { language, workspace } = useStore();
  const [data, setData] = React.useState<Conjugations | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'unavailable'>('loading');

  /*
   * Choosing by default.
   *
   * It is the gentler way in — you can start without knowing whether you know
   * the form, and on a phone it does not ask anyone to find á and ú on a
   * keyboard before answering a single question. Typing is the harder exercise
   * and stays one tap away, and whichever is picked is remembered, so this only
   * decides where somebody starts.
   */
  const [mode, setMode] = React.useState<Mode>(() => load<Mode>(MODE_KEY, 'choose'));
  const [groups, setGroups] = React.useState<Set<string>>(new Set());
  const [question, setQuestion] = React.useState<Question | null>(null);
  const [typed, setTyped] = React.useState('');
  const [verdict, setVerdict] = React.useState<Verdict | null>(null);
  const [score, setScore] = React.useState({ right: 0, asked: 0 });
  const [misses, setMisses] = React.useState<Record<string, number>>({});
  const formRef = React.useRef<HTMLFormElement>(null);

  /*
   * The question that is on its way out, held exactly as it was answered.
   *
   * The new card has to push the old one, and a push needs both of them on
   * screen at once — so the answered card is frozen into a copy that leaves
   * while the fresh one arrives. It is inert while it goes: aria-hidden and
   * untouchable, because it is a picture of a question that is already over.
   */
  const [outgoing, setOutgoing] = React.useState<
    { question: Question; verdict: Verdict | null; typed: string; score: typeof score } | null
  >(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const arriving = React.useRef<HTMLDivElement>(null);
  const leaving = React.useRef<HTMLDivElement>(null);
  const heightBefore = React.useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  useChrome({ title: 'Conjugation Drill', titleIcon: 'spell-check' });

  React.useEffect(() => {
    let live = true;
    setState('loading'); setData(null); setQuestion(null); setVerdict(null); setOutgoing(null);
    void loadConjugation(language).then((d) => {
      if (!live) return;
      setData(d);
      setState(d ? 'ready' : 'unavailable');
      if (d) {
        const all = groupsOf(d, language).map((g) => g.id);
        // The present indicative to begin with, because it is the tense
        // everything else is learned against — and because opening on all eight
        // of Spanish's is how a drill tells somebody it is not for them.
        const saved = load<string[]>(GROUP_KEY, []).filter((g) => all.includes(g));
        setGroups(new Set(saved.length ? saved : [all[0]]));
      }
    });
    return () => { live = false; };
  }, [language]);

  const next = React.useCallback((avoid: string | null = null) => {
    if (!data) return;
    setQuestion(pick(data, groups, language, misses, avoid));
    setTyped(''); setVerdict(null);
  }, [data, groups, language, misses]);

  // A new question whenever the scope changes, so the screen is never showing a
  // cell the reader has just switched off.
  React.useEffect(() => {
    if (state === 'ready' && data && groups.size) setQuestion((q) => q ?? pick(data, groups, language, misses, null));
  }, [state, data, groups, language, misses]);

  React.useEffect(() => {
    // Input is a function component and does not forward a ref, so the field is
    // reached through the form rather than held directly.
    if (mode === 'type' && question && !verdict) formRef.current?.querySelector('input')?.focus();
  }, [mode, question, verdict]);

  const answer = (given: string) => {
    if (!question || verdict) return;
    const result = mark(given, question.answer);
    setVerdict(result);
    setScore((s) => ({ right: s.right + (result === 'wrong' ? 0 : 1), asked: s.asked + 1 }));
    const id = `${question.word}|${question.cell}`;
    setMisses((m) => ({
      ...m,
      // A correct answer pays down the debt rather than clearing it: one right
      // guess is not evidence the form is known.
      [id]: result === 'wrong' ? (m[id] ?? 0) + 1 : Math.max(0, (m[id] ?? 0) - 1),
    }));
    playSound(result === 'wrong' ? 'gradeAgain' : 'gradeGood');
  };

  /** Freeze what is on screen, then ask the next one — the two overlap. */
  const advance = () => {
    if (!question) return;
    if (!reducedMotion && stage.current) {
      heightBefore.current = stage.current.getBoundingClientRect().height;
      setOutgoing({ question, verdict, typed, score });
    }
    next(`${question.word}|${question.cell}`);
  };

  React.useLayoutEffect(() => {
    if (!outgoing) return undefined;
    const stageEl = stage.current;
    const inEl = arriving.current;
    const outEl = leaving.current;
    // Nothing to push against — the scope may have emptied under us.
    if (!stageEl || !inEl || !outEl) { setOutgoing(null); return undefined; }

    // Set here rather than as a prop because React 18 has no typing for it. The
    // card that is leaving keeps two live buttons — the right answer and the one
    // that was picked — and tabbing into a card on its way out would be a way to
    // answer a question that has already been marked.
    outEl.setAttribute('inert', '');

    const ms = 420;
    const easing = 'cubic-bezier(.16,1,.3,1)';
    /*
     * Off to the left by slightly more than its own width, so the old card is
     * gone rather than resting against the edge — 108% covers the gap the
     * page's padding leaves beside it.
     */
    const animations = [
      outEl.animate(
        [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-108%)', opacity: 0 }],
        { duration: ms, easing, fill: 'backwards' },
      ),
      inEl.animate(
        [{ transform: 'translateX(108%)' }, { transform: 'none' }],
        { duration: ms, easing, fill: 'backwards' },
      ),
    ];

    /*
     * And the stage follows them between the two heights.
     *
     * The card that leaves is a line taller than the one arriving — it carries
     * a verdict and the fresh one does not — so without this the page below
     * would jump up the instant the push began, which is the one moment the
     * reader is watching the card and not the page.
     */
    const from = heightBefore.current;
    const to = inEl.getBoundingClientRect().height;
    if (Math.abs(to - from) > 1) {
      animations.push(stageEl.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: ms, easing, fill: 'backwards' },
      ));
    }

    animations[0].addEventListener('finish', () => setOutgoing(null));
    return () => animations.forEach((a) => a.cancel());
  }, [outgoing]);

  if (state === 'unavailable' || (state === 'ready' && !data)) {
    return (
      <div style={page}>
        <EmptyTool
          icon="spell-check"
          accent={ACCENT}
          title={`No ${workspace.name} verbs`}
          description={HAS_CONJUGATION[language]
            ? 'The verb tables could not be loaded. Check your connection and try again.'
            : 'English is the language the other workspaces are explained in, so it has no verb tables here. Switch to Dutch, Spanish or Portuguese to drill.'}
          action={(
            <Link to="/app/cards" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" iconLeft={<Icon name="layers" size={16} />}>Open Flashcards</Button>
            </Link>
          )}
        />
      </div>
    );
  }

  if (state === 'loading' || !data) {
    return <div style={page}><p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>Loading…</p></div>;
  }

  const all = groupsOf(data, language);

  return (
    <div style={page}>
      <header style={{ marginBottom: 'var(--space-7)' }}>
        <span style={{ fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {workspace.name} · {Object.keys(data.words).length} verbs
        </span>
        <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15 }}>
          Conjugation Drill
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)', maxWidth: 520, lineHeight: 'var(--lh-relaxed)' }}>
          The most common verbs in {workspace.name}, asked one form at a time. What you get wrong
          comes back sooner.
        </p>
      </header>

      {/*
        * How the drill is set up, in one band above the card.
        *
        * What to ask and how to answer it are the same kind of control: both
        * are settings for the question rather than part of answering it, both
        * are remembered, and neither changes once a session is under way. They
        * belong together, and they belong before the card — the card is the
        * question, and everything after it is what you do once it is over.
        */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        {/* What to drill. Chips rather than a select: the set is small, several
            can be on at once, and which are on is worth seeing without opening
            anything. */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {all.map((g) => {
          const on = groups.has(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const nextGroups = new Set(groups);
                if (on && nextGroups.size > 1) nextGroups.delete(g.id);
                else if (!on) nextGroups.add(g.id);
                setGroups(nextGroups);
                save(GROUP_KEY, [...nextGroups]);
                setQuestion(pick(data, nextGroups, language, misses, null));
                setTyped(''); setVerdict(null); setOutgoing(null);
              }}
              style={{
                border: 'none', cursor: 'pointer', padding: 0, background: 'transparent',
                borderRadius: 'var(--radius-tag)',
              }}
            >
              <Tag color={on ? ACCENT : 'var(--text-muted)'} size="md">{g.label}</Tag>
            </button>
          );
        })}
        </div>

        {/*
          * A segmented control rather than two buttons.
          *
          * Two buttons where one is filled and one is not reads as an action
          * and its lesser sibling — "Choosing" looked like something that would
          * happen next, rather than the state the screen is not in. A pill
          * track shows both as one choice with one of them taken.
          *
          * Tabs, not Switch: a switch has an on state and an off state, and
          * neither of these is the absence of the other. And it is a tablist
          * honestly — the card below really does swap between a text field and
          * four buttons.
          */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flex: 'none' }}>
          <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>Answer by</span>
          <Tabs
            variant="pill"
            value={mode}
            items={[{ value: 'choose', label: 'Choosing' }, { value: 'type', label: 'Typing it' }]}
            onChange={(v) => { setMode(v as Mode); save(MODE_KEY, v); setTyped(''); setVerdict(null); setOutgoing(null); }}
          />
        </div>
      </div>

      {/*
        * The stage the cards pass through.
        *
        * Clipped, because the one leaving travels a full width sideways and
        * would otherwise slide out over the rest of the page. The Card carries
        * no resting shadow — only an inset ring — so there is nothing for the
        * clip to cut off.
        */}
      <div ref={stage} style={{ position: 'relative', overflow: 'hidden' }}>
        {question && (
          <div ref={arriving}>
            <QuestionCard
              language={language}
              question={question}
              mode={mode}
              verdict={verdict}
              typed={typed}
              score={score}
              formRef={formRef}
              onTyped={setTyped}
              onCheck={() => answer(typed)}
              onPick={(opt) => { setTyped(opt); answer(opt); }}
            />
          </div>
        )}
        {outgoing && (
          <div
            ref={leaving}
            aria-hidden
            style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }}
          >
            <QuestionCard
              language={language}
              question={outgoing.question}
              mode={mode}
              verdict={outgoing.verdict}
              typed={outgoing.typed}
              score={outgoing.score}
            />
          </div>
        )}
        {!question && (
          <Card>
            <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>
              Nothing to ask with those tenses selected.
            </p>
          </Card>
        )}
      </div>

      {/*
        * Continue lives out here, not in the card.
        *
        * The card is the question; this is what you do once the question is
        * over, and putting it inside would make it look like one more thing to
        * answer. Below and to the right is where the eye already is after
        * reading the verdict, and it is where the thumb is on a phone.
        *
        * The row holds its height whether or not the button is in it, so
        * answering does not shove everything underneath down the page.
        */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: SLOT, marginTop: 'var(--space-5)' }}>
        {verdict && !outgoing && <ContinueButton verdict={verdict} onClick={advance} />}
      </div>

      <style>{MOTION}</style>
    </div>
  );
}
