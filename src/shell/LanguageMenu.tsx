import * as React from 'react';
import { Badge, Icon } from 'lingo-ds';
import { useStore } from '../state/store';
import { WORKSPACES } from '../data/seed';
import { flagUrl } from '../data/illustrations';
import { MenuItem } from './MenuItem';

/**
 * The language picker, top right of the content pane. Flags never appear alone —
 * always beside the language name written out in full.
 */
export interface LanguageMenuProps {
  /**
   * Tightens the trigger for a narrow top bar: less padding, no chevron. The
   * flag and the language name both stay — "a flag is never the only
   * identifier" is a content rule, not a layout preference, so it survives the
   * phone.
   */
  compact?: boolean;
}

export function LanguageMenu({ compact = false }: LanguageMenuProps) {
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
          display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, flex: 'none',
          // 44 on touch: the guide's floor for anything touchable.
          height: compact ? 44 : 34, padding: compact ? '0 8px' : '0 10px 0 8px',
          borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)',
          background: open ? 'var(--surface-card)' : 'transparent', color: 'var(--text-strong)',
          cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-13)', fontWeight: 800,
        }}
      >
        {/* alt="" — the language name sits right beside it, so a screen reader
            announcing "flag: United Kingdom, English" would say it twice. */}
        <img src={flagUrl(workspace.flagHex)} alt="" width={18} height={18} style={{ display: 'block', flex: 'none' }} />
        {workspace.name}
        {!compact && <Icon name="chevron-down" size={14} style={{ color: 'var(--text-muted)' }} />}
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
            <MenuItem
              key={w.code}
              selected={w.code === workspace.code}
              onClick={() => { setLanguage(w.code); setOpen(false); }}
            >
              <img src={flagUrl(w.flagHex)} alt="" width={20} height={20} style={{ display: 'block', flex: 'none' }} />
              <span style={{ flex: 1, minWidth: 0 }}>{w.name}</span>
              {w.code === workspace.code && <Icon name="check" size={16} style={{ color: w.color, flex: 'none' }} />}
            </MenuItem>
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
