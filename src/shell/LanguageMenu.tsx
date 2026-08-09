import * as React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Badge, Icon, MenuItem } from 'lingo-ds';
import { useStore } from '../state/store';
import { WORKSPACES } from '../data/seed';
import { flagUrl } from '../data/illustrations';

/**
 * The workspace switcher. Flags never appear alone — always beside the language
 * name written out in full.
 *
 * It used to sit at the top right of the content pane, which is per-screen
 * chrome holding a control whose effect is global: the same picker, saying the
 * same thing, redrawn by every screen. It lives beside Settings now — in the
 * rail's bottom cluster on a desktop, in the dock's More sheet on a phone —
 * where the rest of the app-wide controls are, and where it is stated once.
 *
 * Choosing a language navigates Home. Every screen below Home is a view of one
 * workspace, so staying put after a switch means staying on a screen that is
 * about the workspace you just left. Home is the one screen that is about
 * whichever workspace you are in.
 */
export interface LanguageMenuProps {
  /**
   * `rail` is the 72px column: flag over name, popover opening to the right.
   * `row` is a full-width row in the dock's More sheet, popover opening upward.
   */
  variant: 'rail' | 'row';
}

export function LanguageMenu({ variant }: LanguageMenuProps) {
  const { workspace, setLanguage, prefs } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  /**
   * Where the rail's popover goes, in viewport coordinates.
   *
   * The rail scrolls when the window is too short for every tile, and an element
   * that scrolls clips in both directions — so a popover positioned out of the
   * rail's 72px was simply cut off at its edge. It is portalled to the body to
   * get out from under that, which costs it its anchor and means measuring one.
   */
  const [anchor, setAnchor] = React.useState<{ left: number; bottom: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!open || variant !== 'rail') return undefined;
    const measure = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (r) setAnchor({ left: r.right + 10, bottom: window.innerHeight - r.bottom });
    };
    measure();
    // Capture, so a scroll of the rail itself counts and not just the window's.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, variant]);

  React.useEffect(() => {
    if (!open) return undefined;
    // Asks the two elements whether the click was theirs rather than relying on
    // the event not reaching here — the menu is in a portal for the rail, so
    // stopping propagation through the React tree would not describe where the
    // click actually landed in the document.
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (code: typeof WORKSPACES[number]['code']) => {
    setOpen(false);
    if (code === workspace.code) return;
    setLanguage(code);
    navigate('/app');
  };

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Language track"
      // On the body for the rail, so it names the theme it should be drawn in
      // rather than inheriting the dark island it was triggered from. The scopes
      // nest, so this holds wherever it lands.
      data-theme={prefs.theme}
      style={{
        zIndex: 40, minWidth: 224, padding: 6,
        borderRadius: 'var(--radius-lg)', background: 'var(--surface-raised)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 2,
        ...(variant === 'rail'
          // Bottom-aligned and to the right of the rail: the trigger sits at its
          // foot, so a menu opening downward would run off the screen.
          ? { position: 'fixed', left: anchor?.left ?? 0, bottom: anchor?.bottom ?? 0,
              visibility: anchor ? 'visible' : 'hidden' }
          : { position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0 }),
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
        <MenuItem key={w.code} selected={w.code === workspace.code} onClick={() => choose(w.code)}>
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
  );

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: variant === 'rail' ? '100%' : undefined, flex: 'none' }}
    >
      {variant === 'rail' ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Switch language"
          aria-haspopup
          aria-expanded={open}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            // Inset from the rail's full 72px so the fill has an edge to sit
            // inside. At width 100% it ran into both walls of the column and
            // read as a band across it rather than as this control being lit.
            width: 'calc(100% - 12px)', margin: '0 auto',
            padding: '6px 2px', border: 'none', cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
            // Same two axes as MenuItem: open is a state of the menu, hovered is
            // a state of the pointer, and an open trigger still has to answer the
            // cursor rather than freezing at its resting fill.
            background: open
              ? (hovered ? 'var(--surface-raised-hover)' : 'var(--surface-raised)')
              : (hovered ? 'var(--surface-hover)' : 'transparent'),
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
      ) : (
        <MenuItem opensMenu expanded={open} label="Switch language" onClick={() => setOpen((o) => !o)}>
          <img src={flagUrl(workspace.flagHex)} alt="" width={18} height={18} style={{ display: 'block', flex: 'none' }} />
          <span style={{ flex: 1, minWidth: 0 }}>{workspace.name}</span>
          <Icon name="chevron-down" size={16} style={{ color: 'var(--text-muted)', flex: 'none' }} />
        </MenuItem>
      )}

      {open && (variant === 'rail' ? createPortal(menu, document.body) : menu)}
    </div>
  );
}
