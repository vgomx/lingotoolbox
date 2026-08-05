import * as React from 'react';
import { Dialog, Icon } from 'lingo-ds';
import { LEGAL_NOTICES } from '../legalNotices';

export interface LegalDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The open-source acknowledgements.
 *
 * The notices are an accordion with one open at a time. A licence is thousands
 * of words nobody reads start to finish, so listing them expanded would bury the
 * list itself; and letting several open at once puts it straight back to being
 * taller than the dialog.
 *
 * lingo-ds's Dialog already caps its own height and scrolls its children, so
 * there is deliberately no second scroll container here — nested scroll areas
 * mean a wheel gesture lands in whichever box the pointer happens to be over.
 */
export function LegalDialog({ open, onClose }: LegalDialogProps) {
  const [openNotice, setOpenNotice] = React.useState<string | null>(null);
  const noticeRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (!open) setOpenNotice(null);
  }, [open]);

  /**
   * Opening a notice low in the list would otherwise leave its heading where it
   * was while the text unfolded past the fold. Deferred a frame because the text
   * has to be in the DOM before there is anything to scroll to.
   */
  const toggle = (name: string) => {
    const next = openNotice === name ? null : name;
    setOpenNotice(next);
    if (!next) return;
    requestAnimationFrame(() => {
      noticeRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Open-source acknowledgements"
      description="Lingo Toolbox is built with the software below. Only what actually reaches your browser is listed — build tooling never ships, so it is left out."
      width={560}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 'var(--space-6)' }}>
        {LEGAL_NOTICES.map((notice) => {
          const isOpen = openNotice === notice.name;
          return (
            <div
              key={notice.name}
              ref={(el) => { noticeRefs.current[notice.name] = el; }}
              style={{ borderRadius: 'var(--radius-md)', boxShadow: 'var(--ring-inset)', overflow: 'hidden', scrollMarginTop: 8 }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`legal-${notice.name}`}
                onClick={() => toggle(notice.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%',
                  padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'var(--font-ui)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'grid', color: 'var(--text-muted)', flex: 'none',
                    transform: isOpen ? 'none' : 'rotate(-90deg)',
                    transition: 'transform var(--dur-fast) var(--ease-standard)',
                  }}
                >
                  <Icon name="chevron-down" size={15} />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-14)', fontWeight: 800, color: 'var(--text-strong)' }}>
                  {notice.name}
                </span>
                <span style={{ flex: 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-10)', color: 'var(--text-faint)' }}>
                  {notice.license}
                </span>
              </button>

              {isOpen && (
                <div id={`legal-${notice.name}`} style={{ padding: '0 12px 12px 38px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-10)', color: 'var(--text-faint)', marginBottom: 8 }}>
                    {notice.packages}
                  </div>
                  {/* No height cap here on purpose — the licence runs its full
                      length and the Dialog's own scroll carries it. */}
                  <pre
                    style={{
                      margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-10)',
                      lineHeight: 1.55, color: 'var(--text-muted)', whiteSpace: 'pre-wrap',
                    }}
                  >
                    {notice.text}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
