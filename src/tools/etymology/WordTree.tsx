import * as React from 'react';
import { EtymologyNode, Icon } from 'lingo-ds';
import type { Etymologies } from '../../data/etymology';
import { langName, langLink, langArticle } from '../../data/etymology';
import { RELATION, SAME_LANGUAGE, isNamed } from './relations';
import { Specimen } from './Specimen';
import { useOpenLanguage } from './languageContext';

/**
 * How far the tree will unfold before it stops offering to go further.
 *
 * Not a rendering limit so much as a claim about usefulness: by the fourth
 * level down you are reading the etymology of a suffix, which is a different
 * question from the one you asked.
 */
const MAX_DEPTH = 4;

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' };

/**
 * The word a level is about, sized by how far down it sits.
 *
 * The root is the subject of the whole card and is set well above the labels
 * describing it; the parts below it are subordinate, and at anything near the
 * root's size they competed with it for the same reading.
 *
 * break-word because Dutch will hand you `hottentottententententoonstellings-
 * terrein` — 41 characters that at this size are wider than a phone. The
 * ancestor forms already break the same way.
 */
const headword = (depth: number): React.CSSProperties => ({
  ...mono,
  fontSize: depth === 0 ? 'var(--fs-24)' : 'var(--fs-14)',
  fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'],
  wordBreak: 'break-word',
  minWidth: 0,
});

/**
 * The ancestry spine for one word.
 *
 * This used to be a hand-rolled row — a flat 5px dot on a flat 1.5px line,
 * with the relation and language as one muted string and the form in a well
 * below. The design system already ships the tracker this was an imitation of,
 * and shipped it better: a hollow ring so the word you looked up is the only
 * solid mark, and a connector that fades as the chain runs out of evidence.
 * It was only ever used on the marketing page.
 *
 * The forms are passed as Specimen nodes rather than through a prop on the
 * component, because the well is a fact about *this* data — see Specimen.
 */
function Steps({ data, steps }: { data: Etymologies; steps: [string, string, string][] }) {
  const openLanguage = useOpenLanguage();
  if (!steps.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--space-4)' }}>
      {steps.map(([rel, code, term], i) => {
        // A step that stays in the language has no stamp to show, so it has no
        // panel to open either — see SAME_LANGUAGE.
        const sameLang = SAME_LANGUAGE.has(rel);
        return (
          <EtymologyNode
            key={`${code}-${term}-${i}`}
            size="sm"
            connector={i < steps.length - 1}
            word={isNamed(term) ? <Specimen>{term}</Specimen> : undefined}
            relation={RELATION[rel] ?? rel}
            language={sameLang ? undefined : langName(data, code)}
            languageHref={sameLang ? undefined : langLink(data, code)}
            onLanguageActivate={openLanguage && !sameLang
              ? () => openLanguage({ code, name: langName(data, code), href: langLink(data, code), article: langArticle(data, code) })
              : undefined}
          />
        );
      })}
    </div>
  );
}

/**
 * One word, its lineage, and the words it is built from — each of which opens
 * into its own lineage.
 *
 * This is where the tool earns "Explorer". The ancestry of a single word is a
 * line, and drawing a line as a tree would be a lie about the data; but 45% of
 * Dutch words are compounds whose parts are themselves entries with their own
 * descent, and *that* branches. woordenboek is woord and boek, and each of
 * those goes back to Proto-Germanic by a different route.
 *
 * `trail` is the path taken to get here, and it is what stops the recursion
 * rather than depth alone: blond lists blondje among its relatives and blondje
 * is built from blond, so a naive walk oscillates between the two forever.
 * Anything already on the path is shown as a leaf.
 */
export function WordTree({ word, data, gloss, depth = 0, trail = [], defaultOpen = false }: {
  word: string;
  data: Etymologies;
  /** What the root word means. Only the root: a part's meaning is its own page. */
  gloss?: string;
  depth?: number;
  trail?: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  const entry = data.words[word];
  const steps = (entry?.a ?? []) as [string, string, string][];
  const parts = entry?.p ?? [];

  // A part is only worth a disclosure triangle if we hold its own entry and it
  // is not already an ancestor of this node.
  const openable = parts.filter((p) => data.words[p] && !trail.includes(p) && p !== word);
  const canExpand = depth < MAX_DEPTH && openable.length > 0;

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {canExpand ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{
              // flex-start, not center: a word long enough to wrap put the
              // chevron beside its middle line, pointing at nothing. The icon
              // takes the offset instead, so it lands on the first line either
              // way — and on a word that fits, that is where center put it.
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: '2px 4px 2px 0',
              border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-strong)',
              font: 'inherit', textAlign: 'left', minWidth: 0,
            }}
          >
            <Icon
              name="chevron-right"
              size={14}
              style={{
                color: 'var(--text-muted)', flex: 'none',
                // Half the difference between the line box (36px at the root,
                // 21px nested) and the 14px icon.
                marginTop: depth === 0 ? 11 : 3.5,
                transform: open ? 'rotate(90deg)' : 'none',
                transition: 'transform var(--dur-fast) var(--ease-out)',
              }}
            />
            <span style={headword(depth)}>{word}</span>
          </button>
        ) : (
          <span style={{ ...headword(depth), paddingLeft: depth ? 18 : 0 }}>{word}</span>
        )}
      </div>

      {/* Under the headword and above the descent, so the card answers "what
          is it" before "where is it from". Indented to clear the disclosure
          chevron, so it lines up with the word rather than with the arrow. */}
      {gloss && depth === 0 && (
        <p
          style={{
            margin: '2px 0 0', paddingLeft: canExpand ? 25 : 0,
            fontSize: 'var(--fs-14)', color: 'var(--text-muted)',
            lineHeight: 'var(--lh-relaxed)',
          }}
        >
          {gloss}
        </p>
      )}

      <div style={{ paddingLeft: depth === 0 ? 0 : 18 }}>
        <Steps data={data} steps={steps} />

        {parts.length > 0 && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <span style={{ fontSize: 'var(--fs-11)', color: 'var(--text-muted)' }}>
              Built from {parts.join(' + ')}
            </span>
          </div>
        )}

        {canExpand && open && (
          <div
            style={{
              marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
              paddingLeft: 'var(--space-5)', borderLeft: '2px solid var(--border)',
            }}
          >
            {openable.map((p) => (
              <WordTree key={p} word={p} data={data} depth={depth + 1} trail={[...trail, word]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
