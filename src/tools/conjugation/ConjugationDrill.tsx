import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Icon, Input, Tag, playSound } from 'lingo-ds';
import { useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import { EmptyTool } from '../EmptyTool';
import {
  HAS_CONJUGATION, cellName, groupsOf, loadConjugation, mark,
  type Conjugations, type Verdict,
} from '../../data/conjugation';

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

export function ConjugationDrill() {
  const { language, workspace } = useStore();
  const [data, setData] = React.useState<Conjugations | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'unavailable'>('loading');

  const [mode, setMode] = React.useState<Mode>(() => load<Mode>(MODE_KEY, 'type'));
  const [groups, setGroups] = React.useState<Set<string>>(new Set());
  const [question, setQuestion] = React.useState<Question | null>(null);
  const [typed, setTyped] = React.useState('');
  const [verdict, setVerdict] = React.useState<Verdict | null>(null);
  const [score, setScore] = React.useState({ right: 0, asked: 0 });
  const [misses, setMisses] = React.useState<Record<string, number>>({});
  const formRef = React.useRef<HTMLFormElement>(null);

  useChrome({ title: 'Conjugation Drill', titleIcon: 'spell-check' });

  React.useEffect(() => {
    let live = true;
    setState('loading'); setData(null); setQuestion(null); setVerdict(null);
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
  const name = question ? cellName(language, question.cell) : null;

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

      {/* What to drill. Chips rather than a select: the set is small, several
          can be on at once, and which are on is worth seeing without opening
          anything. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
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
                setTyped(''); setVerdict(null);
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

      {question && name && (
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
              onSubmit={(e) => { e.preventDefault(); if (verdict) next(`${question.word}|${question.cell}`); else answer(typed); }}
              style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={`${name.pronoun}…`}
                  disabled={!!verdict}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <Button type="submit" style={{ flex: 'none' }}>
                {verdict ? 'Next' : 'Check'}
              </Button>
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
                    onClick={() => { setTyped(opt); answer(opt); }}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>
          )}

          {verdict && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <span
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
              {mode === 'choose' && (
                <Button size="sm" variant="secondary" onClick={() => next(`${question.word}|${question.cell}`)}>Next</Button>
              )}
            </div>
          )}
        </Card>
      )}

      {!question && (
        <Card>
          <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>
            Nothing to ask with those tenses selected.
          </p>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 'var(--gap-inline)', marginTop: 'var(--space-6)', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>Answer by</span>
        {(['type', 'choose'] as Mode[]).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? 'primary' : 'ghost'}
            onClick={() => { setMode(m); save(MODE_KEY, m); setTyped(''); setVerdict(null); }}
          >
            {m === 'type' ? 'Typing it' : 'Choosing'}
          </Button>
        ))}
      </div>
    </div>
  );
}
