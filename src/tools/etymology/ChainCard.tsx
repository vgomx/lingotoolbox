import { Card, EtymologyNode, Icon } from 'lingo-ds';
import type { Chain, Etymologies } from '../../data/etymology';
import { langName } from '../../data/etymology';
import { RELATION, isNamed } from './relations';
import { CognateTag } from './CognateTag';
import { Specimen } from './Specimen';

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--fs-14)',
  color: 'var(--text-strong)',
};

/**
 * One word's lineage, oldest at the bottom.
 *
 * A list, because a word's ancestry is a line: drawing a line as a tree would
 * be a lie about the data. The branching lives one level up, in WordDetails,
 * where a compound opens into the separate descent of each of its parts.
 *
 * Upward is where it stops either way. The ancestors here are text rather than
 * entries — following Latin fenestra to *its* origins needs Latin's own
 * etymologies, which would cost more than every workspace in the app together.
 *
 * The rail on the left is the point. It makes the descent legible at a glance —
 * you can see that pond goes back four steps without reading any of them.
 */
export function ChainCard({ word, chain, data, compact = false, interactive = false }: {
  word: string;
  chain: Chain;
  data: Etymologies;
  compact?: boolean;
  interactive?: boolean;
}) {
  const steps = chain.a ?? [];

  return (
    <Card
      /*
       * The headword carries the card, so it is set above Card's own 18px
       * title. Everything under it is apparatus — a relation, a language, a
       * form — and at the default size the word it all describes was the same
       * weight as the labels describing it.
       *
       * Passed as a node rather than through a new prop on Card: `title` takes
       * a ReactNode for exactly this, and one caller wanting a larger heading
       * is not yet the component missing a size.
       */
      title={compact ? undefined : (
        <span style={{ fontSize: 'var(--fs-24)', lineHeight: 1.15 }}>{word}</span>
      )}
      interactive={interactive}
      style={{ height: '100%' }}
    >
      {compact && (
        <span style={{ ...mono, fontSize: 'var(--fs-18)', fontWeight: 'var(--fw-black)' as React.CSSProperties['fontWeight'] }}>
          {word}
        </span>
      )}

      {steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/*
            * The same tracker as the details view, so the card you click and
            * the page it opens are drawn by one component rather than two
            * hand-rolled spines that drifted apart.
            *
            * The language stamps are plain text here, unlike in the details
            * view where they link and open a panel. Both places this card
            * renders make an interactive stamp wrong: on the Explorer home the
            * whole card is a Link, and an <a> inside an <a> is invalid — the
            * browser splits the DOM to cope and clicks land unpredictably; in
            * a review it sits inside a dialog, where a link out would drop
            * someone mid-session. Exploring a language is what the details
            * view is for.
            */}
          {steps.map(([rel, code, term], i) => (
            <EtymologyNode
              key={`${code}-${term}-${i}`}
              size="sm"
              connector={i < steps.length - 1}
              // Wiktionary will say a word is "ultimately Semitic" without
              // naming a Semitic word for it, and writes that as a bare hyphen.
              // The claim is real and worth keeping — abacus really does go back
              // past Greek — but printing the placeholder gave a well containing
              // "-", which reads as a broken record rather than as an honest
              // "we know the family, not the word".
              word={isNamed(term) ? <Specimen>{term}</Specimen> : undefined}
              relation={RELATION[rel] ?? rel}
              language={langName(data, code)}
            />
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
        /*
         * A block of its own, because it is a list rather than a line.
         *
         * Six cognates wrap over three rows, and set loose on the card that
         * ran straight on from the ancestry above with nothing to say the
         * subject had changed — the descent is what this word did, the
         * cognates are what its relatives did instead. The label moves onto
         * its own line for the same reason: inline, "Compare" read as the
         * first item in the row it was introducing.
         */
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
            padding: 'var(--space-5)', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-sunken)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--fs-11)', fontWeight: 'var(--fw-black)' as React.CSSProperties['fontWeight'],
              letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)',
            }}
          >
            Compare
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {chain.c.slice(0, 6).map(([code, term], i) => (
              <CognateTag key={`${code}-${term}-${i}`} language={langName(data, code)} term={term} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
