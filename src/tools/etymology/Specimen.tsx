import * as React from 'react';

/**
 * An ancestor form, set as a specimen rather than as prose.
 *
 * Reconstructed words carry marks that are the whole point of printing them —
 * the asterisk on *wurdą saying nobody ever wrote it down, the macron on
 * grātīs, the ƀ and þ that never made it into the modern alphabet. Mono keeps
 * them from being read as typos, and the well gives the form an edge so it
 * reads as a thing being quoted rather than as more of the sentence around it.
 *
 * Lives here rather than in the design system because it is a fact about this
 * data, not about etymology trackers in general — EtymologyNode takes `word`
 * as a node so that callers with plain words are not made to look like this.
 *
 * inline-block, not block: this one sits in a baseline row beside its relation
 * and language, unlike the chain card's, which has the line to itself.
 */
export function Specimen({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px 8px',
        wordBreak: 'break-word',
        maxWidth: '100%',
      }}
    >
      {children}
    </span>
  );
}
