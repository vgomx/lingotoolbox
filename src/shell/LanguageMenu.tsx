import * as React from 'react';
import { Icon, MenuItem } from 'lingo-ds';
import { useStore } from '../state/store';
import { flagUrl } from '../data/illustrations';
import { useLanguagePicker } from './languagePicker';

/**
 * The rail's and the dock's way in to the language selector.
 *
 * It used to be the selector: a popover it positioned, measured, portalled out
 * of the rail's clipping, and dismissed on outside clicks — all of it written
 * twice, once per variant, because the rail opens to the right and the dock
 * opens upward. All of that is gone. The list lives in one dialog now (see
 * languagePicker) and these are two triggers for it, which is what they were
 * always doing between the machinery.
 *
 * Flags never appear alone — always beside the language name written out.
 */
export interface LanguageMenuProps {
  /**
   * `rail` is the 72px column: flag over name.
   * `row` is a full-width row in the dock's More sheet.
   */
  variant: 'rail' | 'row';
}

export function LanguageMenu({ variant }: LanguageMenuProps) {
  const { workspace } = useStore();
  const [hovered, setHovered] = React.useState(false);
  const open = useLanguagePicker();
  if (!open) return null;

  if (variant === 'row') {
    return (
      <MenuItem
        opensMenu
        // The same act on a phone as in the rail, so the same sound: this opens
        // the panel that trigger opens, and a MenuItem's default `tap` is for
        // rows that take you somewhere.
        sound={false}
        label="Switch language"
        onClick={open}
      >
        <img src={flagUrl(workspace.flagHex)} alt="" width={18} height={18} style={{ display: 'block', flex: 'none' }} />
        <span style={{ flex: 1, minWidth: 0 }}>{workspace.name}</span>
        <Icon name="chevron-down" size={16} style={{ color: 'var(--text-muted)', flex: 'none' }} />
      </MenuItem>
    );
  }

  return (
    <button
      type="button"
      // Bespoke rather than a RailTile: a flag image over a caption, with no
      // active pip. The sound is the picker's, since opening it is what this
      // does and the picker is what knows it happened.
      onClick={open}
      aria-label="Switch language"
      aria-haspopup="dialog"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        // Inset from the rail's full 72px so the fill has an edge to sit inside.
        // At width 100% it ran into both walls of the column and read as a band
        // across it rather than as this control being lit.
        width: 'calc(100% - 12px)', margin: '0 auto',
        padding: '6px 2px', border: 'none', cursor: 'pointer',
        borderRadius: 'var(--radius-md)',
        background: hovered ? 'var(--surface-hover)' : 'transparent',
        transition: 'var(--transition-control)',
      }}
    >
      {/* alt="" — the language name is right underneath, so a screen reader
          announcing "flag: Portugal, Portuguese" would say it twice. */}
      <img src={flagUrl(workspace.flagHex)} alt="" width={22} height={22} style={{ display: 'block' }} />
      {/* --fs-8 and normal tracking, like the rail's "Soon" stamps: this is a
          caption under a mark, not a tool's own name, and "Portuguese" is the
          longest thing the 72px column has to hold. */}
      <span
        style={{
          fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-8)',
          fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'],
          letterSpacing: 'var(--ls-normal)', color: 'var(--text-muted)',
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {workspace.name}
      </span>
    </button>
  );
}
