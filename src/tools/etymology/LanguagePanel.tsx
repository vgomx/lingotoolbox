import * as React from 'react';
import { Button, Dialog, Icon } from 'lingo-ds';
import { articleDiffers, loadLanguageInfo, type LanguageInfo } from '../../data/etymology';

/**
 * What a language in the chain actually was, without leaving the word.
 *
 * The stamps used to be plain links out. Following one meant a new tab, a full
 * Wikipedia article, and losing the chain you were halfway down — for a
 * question as small as "what is Old Dutch, roughly?". Two sentences answer that
 * and the full article is still one click away for when they do not.
 *
 * Docked rather than centred: this is reference material read *against* the
 * chain, and a modal in the middle covers the thing it is explaining. On a
 * phone there is no room for that distinction and it comes up as a sheet.
 */
export function LanguagePanel({ code, name, href, article, onClose }: {
  code: string | null;
  name: string;
  href: string | null;
  article: string | null;
  onClose: () => void;
}) {
  const [info, setInfo] = React.useState<LanguageInfo | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!code) { setInfo(null); return undefined; }
    let live = true;
    setLoading(true);
    void loadLanguageInfo().then((all) => {
      if (!live) return;
      setInfo(all[code] ?? null);
      setLoading(false);
    });
    return () => { live = false; };
  }, [code]);

  const mismatched = articleDiffers(name, article);

  if (!code) return null;

  return (
    <Dialog
      placement="end"
      width={420}
      title={name}
      description={info?.d}
      onClose={onClose}
      footer={href && (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" iconRight={<Icon name="external-link" size={14} />}>
            Read the full article
          </Button>
        </a>
      )}
    >
      {/* Dialog's body is a plain scroll container with no gap of its own —
          correct, since most dialogs hold one thing. This one holds three. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {loading && (
        <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>Loading…</p>
      )}

      {!loading && info && (
        <p style={{ margin: 0, fontSize: 'var(--fs-15)', color: 'var(--text-body)', lineHeight: 'var(--lh-relaxed)' }}>
          {info.e}
        </p>
      )}

      {/* A language with no description is not a broken panel. Eleven of the
          562 codes have no article to draw on — "an unidentified substrate"
          has nothing to say about itself — and saying so is better than an
          empty panel that looks like a failed request. */}
      {!loading && !info && (
        <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
          There is no encyclopedia article for {name}. It is usually a family or
          a reconstructed substrate rather than a language anyone wrote down.
        </p>
      )}

      {/* Said plainly, because otherwise the panel is headed "Proto-West
          Germanic" over three paragraphs about the modern West Germanic
          family that never mention the proto-language. The link out was
          quietly doing the same thing; putting the text on the page is what
          made it visible. Sometimes it is only a spelling — New Latin is filed
          as Neo-Latin — and the reader can see that for themselves. */}
      {!loading && info && mismatched && (
        <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
          Wikipedia files this under{' '}
          <span style={{ color: 'var(--text-body)', fontWeight: 'var(--fw-semibold)' as React.CSSProperties['fontWeight'] }}>
            {article}
          </span>
          , which may be a broader or a differently named subject.
        </p>
      )}

      {!loading && info && (
        <p style={{ margin: 0, fontSize: 'var(--fs-12)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
          From Wikipedia, CC BY-SA 4.0.
        </p>
      )}
      </div>
    </Dialog>
  );
}
