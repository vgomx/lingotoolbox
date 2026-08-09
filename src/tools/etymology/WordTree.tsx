import * as React from 'react';
import { Icon } from 'lingo-ds';
import type { Etymologies } from '../../data/etymology';
import { langName } from '../../data/etymology';
import { RELATION, isNamed } from './relations';

/**
 * How far the tree will unfold before it stops offering to go further.
 *
 * Not a rendering limit so much as a claim about usefulness: by the fourth
 * level down you are reading the etymology of a suffix, which is a different
 * question from the one you asked.
 */
const MAX_DEPTH = 4;

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' };

/** The ancestry spine for one word, drawn small enough to nest. */
function Steps({ data, steps }: { data: Etymologies; steps: [string, string, string][] }) {
  if (!steps.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--space-3)' }}>
      {steps.map(([rel, code, term], i) => (
        <div key={`${code}-${term}-${i}`} style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', width: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--tool-etymology)', marginTop: 7, flex: 'none' }} />
            {i < steps.length - 1 && <span style={{ flex: 1, width: 1.5, background: 'var(--border)' }} />}
          </div>
          <div style={{ paddingBottom: i < steps.length - 1 ? 'var(--space-4)' : 0, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--fs-11)', color: 'var(--text-muted)' }}>
              {RELATION[rel] ?? rel}{' '}
              <span style={{ fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'] }}>{langName(data, code)}</span>
            </span>
            {/* Matching the Explorer's cards: the word is a specimen, so it
                gets an edge. The same --surface-sunken at every depth — a
                branch is already indented and ruled, so it does not need the
                well to get lighter as it nests to say where it is. */}
            {isNamed(term) && (
              <div
                style={{
                  ...mono, fontSize: 'var(--fs-13)', wordBreak: 'break-word', marginTop: 3,
                  // fit-content rather than inline-block: it has to hug the word but
                      // stay on its own line, or it rides up beside the label and
                      // wraps "Proto-West Germanic" across two.
                      width: 'fit-content', padding: '2px 8px',
                  background: 'var(--surface-sunken)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {term}
              </div>
            )}
          </div>
        </div>
      ))}
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
export function WordTree({ word, data, depth = 0, trail = [], defaultOpen = false }: {
  word: string;
  data: Etymologies;
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
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '2px 4px 2px 0',
              border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-strong)',
              font: 'inherit', textAlign: 'left', minWidth: 0,
            }}
          >
            <Icon
              name="chevron-right"
              size={14}
              style={{
                color: 'var(--text-muted)', flex: 'none',
                transform: open ? 'rotate(90deg)' : 'none',
                transition: 'transform var(--dur-fast) var(--ease-out)',
              }}
            />
            <span style={{ ...mono, fontSize: depth === 0 ? 'var(--fs-16)' : 'var(--fs-14)', fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'] }}>
              {word}
            </span>
          </button>
        ) : (
          <span style={{ ...mono, fontSize: depth === 0 ? 'var(--fs-16)' : 'var(--fs-14)', fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'], paddingLeft: depth ? 18 : 0 }}>
            {word}
          </span>
        )}
      </div>

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
