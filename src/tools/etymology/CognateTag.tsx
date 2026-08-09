import { Tag } from 'lingo-ds';

/**
 * A related word in another language, as two things rather than one string.
 *
 * "Middle Low German erdappel" set as a single bold run reads as one long name
 * and hides where the language stops and the word starts — which is the only
 * information the chip carries. The rest of the card already draws that
 * distinction: a muted label above, the term in mono below. This is the same
 * pairing turned on its side to fit a chip.
 *
 * Mono on the word also does the quiet work of marking it as a specimen rather
 * than as prose, which matters when it is Old English `eorþæppel` and every
 * character is load-bearing.
 */
export function CognateTag({ language, term }: { language: string; term: string }) {
  return (
    <Tag color="var(--text-muted)">
      {/* One flex item holding normal inline flow, rather than two items spaced
          by `gap`. A gap is layout, not a character: the chip's text content
          came out as "Middle Low Germanerdappel", which is what a screen reader
          announces and what lands on the clipboard. The space is real now. */}
      <span>
        <span style={{ fontSize: 'var(--fs-11)', fontWeight: 'var(--fw-semibold)' as React.CSSProperties['fontWeight'] }}>
          {language}
        </span>
        {' '}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)', color: 'var(--text-strong)' }}>
          {term}
        </span>
      </span>
    </Tag>
  );
}
