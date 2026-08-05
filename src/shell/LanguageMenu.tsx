import * as React from 'react';
import { Badge, Icon } from 'lingo-ds';
import { useStore } from '../state/store';
import { WORKSPACES } from '../data/seed';

/**
 * The language picker, top right of the content pane. Flags never appear alone —
 * always beside the language name written out in full.
 */
export function LanguageMenu() {
  const { workspace, setLanguage } = useStore();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch language"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 10px 0 8px',
          borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)',
          background: open ? 'var(--surface-card)' : 'transparent', color: 'var(--text-strong)',
          cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-13)', fontWeight: 800,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{workspace.flag}</span>
        {workspace.name}
        <Icon name="chevron-down" size={14} style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 40, right: 0, minWidth: 224, zIndex: 40, padding: 6,
            borderRadius: 'var(--radius-lg)', background: 'var(--surface-raised)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)',
              textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 8px 2px',
            }}
          >
            Language track
          </span>
          {WORKSPACES.map((w) => (
            <button
              key={w.code}
              type="button"
              onClick={() => { setLanguage(w.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 8px',
                borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                background: w.code === workspace.code ? 'var(--surface-card)' : 'transparent',
                color: 'var(--text-strong)', fontFamily: 'var(--font-ui)',
                fontSize: 'var(--fs-14)', fontWeight: 800, textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{w.flag}</span>
              <span style={{ flex: 1 }}>{w.name}</span>
              {w.code === workspace.code && <Icon name="check" size={16} style={{ color: w.color }} />}
            </button>
          ))}
          <span style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          {/* Sits under the list because this is where someone looks for a
              language that isn't here yet. Storage is answered in the deck
              sidebar's footer and in Settings, so it isn't repeated here. */}
          <span
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px 8px',
              fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-11)', color: 'var(--text-muted)',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            <Badge tone="neutral" style={{ flex: 'none' }}>Soon</Badge>
            More languages are planned.
          </span>
        </div>
      )}
    </div>
  );
}
