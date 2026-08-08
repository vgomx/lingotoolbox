import { Card, Icon, Tag } from 'lingo-ds';
import type { Chain, Etymologies } from '../../data/etymology';
import { langName } from '../../data/etymology';

/** How each relation reads in a sentence, rather than as a database value. */
const RELATION: Record<string, string> = {
  inherited: 'inherited from',
  derived: 'derived from',
  borrowed: 'borrowed from',
  calque: 'calqued on',
  'semantic loan': 'sense borrowed from',
  root: 'ultimately from the root',
};

/** Did Wiktionary actually name a word here, or only a family? */
const isNamed = (term: string) => !['-', '—', '', '*', '?'].includes(term.trim());

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--fs-14)',
  color: 'var(--text-strong)',
};

/**
 * One word's lineage, oldest at the bottom.
 *
 * A list rather than a tree, because that is the shape of the data: a word has
 * a spine of ancestors and, occasionally, some siblings. Drawing it as a graph
 * would be a lot of machinery to render what is usually four rows — and would
 * imply you can wander off down a branch, which you cannot: the ancestors are
 * text, not entries, because holding Latin's own etymologies would cost more
 * than every workspace in the app put together.
 *
 * The rail on the left is the point. It makes the descent legible at a glance —
 * you can see that pond goes back four steps without reading any of them.
 */
export function ChainCard({ word, chain, data, compact = false }: {
  word: string;
  chain: Chain;
  data: Etymologies;
  compact?: boolean;
}) {
  const steps = chain.a ?? [];

  return (
    <Card title={compact ? undefined : word}>
      {compact && (
        <span style={{ ...mono, fontSize: 'var(--fs-18)', fontWeight: 'var(--fw-black)' as React.CSSProperties['fontWeight'] }}>
          {word}
        </span>
      )}

      {steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map(([rel, code, term], i) => (
            <div key={`${code}-${term}-${i}`} style={{ display: 'flex', gap: 'var(--space-4)' }}>
              {/* The spine: a line down the left with a node per step, drawn
                  with a border rather than an SVG so it stretches with the row
                  however the text wraps. */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', width: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--tool-etymology)', marginTop: 7, flex: 'none' }} />
                {i < steps.length - 1 && <span style={{ flex: 1, width: 2, background: 'var(--border)' }} />}
              </div>
              <div style={{ paddingBottom: i < steps.length - 1 ? 'var(--space-5)' : 0, minWidth: 0 }}>
                <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>
                  {RELATION[rel] ?? rel}{' '}
                  <span style={{ fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'] }}>
                    {langName(data, code)}
                  </span>
                </span>
                {/* Wiktionary will say a word is "ultimately Semitic" without
                    naming a Semitic word for it, and writes that as a bare
                    hyphen. The claim is real and worth keeping — abacus really
                    does go back past Greek — but printing the placeholder gave
                    a mono line containing "-", which reads as a broken record
                    rather than as an honest "we know the family, not the word".
                    So the language stands alone and the term line is dropped. */}
                {isNamed(term) && <div style={{ ...mono, wordBreak: 'break-word' }}>{term}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {chain.p && chain.p.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>Built from</span>
          {chain.p.map((part, i) => (
            <span key={`${part}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {i > 0 && <Icon name="plus" size={12} style={{ color: 'var(--text-faint)' }} />}
              <span style={{ ...mono, fontSize: 'var(--fs-13)' }}>{part}</span>
            </span>
          ))}
        </div>
      )}

      {chain.d && chain.d.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {/* Worth its own line: a doublet is the same ancestor arriving twice
              by different routes, which is the most surprising thing etymology
              has to offer and the easiest to miss in a list of cognates. */}
          <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>Doublet of</span>
          {chain.d.map((d) => <span key={d} style={{ ...mono, fontSize: 'var(--fs-13)' }}>{d}</span>)}
        </div>
      )}

      {chain.c && chain.c.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)', marginRight: 2 }}>Compare</span>
          {chain.c.slice(0, 6).map(([code, term], i) => (
            <Tag key={`${code}-${term}-${i}`} color="var(--text-muted)">
              {langName(data, code)} {term}
            </Tag>
          ))}
        </div>
      )}
    </Card>
  );
}
