import * as React from 'react';

/**
 * Shows which part of the text answered the search.
 *
 * Notes are searched across their title, their body and their tags, so a note
 * can match on a sentence three paragraphs down and arrive with a title
 * containing none of your words. Without this the result looks like a mistake:
 * you typed "diminutive" and got back "de or het?".
 *
 * Case-insensitive, but the original casing is what gets rendered — the point
 * is to point at the text that is there, not to restate the query.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const haystack = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let from = 0;

  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) { out.push(text.slice(from)); break; }
    if (at > from) out.push(text.slice(from, at));
    out.push(
      // Not <mark>, whose user-agent yellow ignores the theme entirely. A tint
      // of the tool's own accent reads as "this is what you asked for" in both.
      <span
        key={at}
        style={{
          background: 'color-mix(in oklab, var(--tool-grammar) 28%, transparent)',
          borderRadius: 'var(--radius-xs)',
          padding: '0 2px',
          color: 'var(--text-strong)',
        }}
      >
        {text.slice(at, at + q.length)}
      </span>,
    );
    from = at + q.length;
  }

  return <>{out}</>;
}
