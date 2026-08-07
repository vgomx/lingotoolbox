import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge, Icon, playSound } from 'lingo-ds';
import { TOOLS } from '../data/seed';
import { useStore } from '../state/store';
import { MenuItem } from './MenuItem';
import { LanguageMenu } from './LanguageMenu';

/** Height of the bar itself, before the home-indicator inset is added under it. */
export const DOCK_HEIGHT = 58;

/**
 * The two tools that are built, plus everything else.
 *
 * A rail can afford seven destinations down the side of a desktop; a dock across
 * a 375px phone fits about four before the labels stop fitting. So the bar
 * carries what you can actually do today and `More` holds the rest — four tools
 * that are designed but not built, and Settings.
 */
const PRIMARY = ['home', 'cards'] as const;

const barItem = (active: boolean): React.CSSProperties => ({
  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', gap: 3, height: DOCK_HEIGHT, padding: 0,
  border: 'none', background: 'transparent', cursor: 'pointer',
  color: active ? 'var(--text-strong)' : 'var(--text-muted)',
  fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-10)',
  fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'],
  letterSpacing: 'var(--ls-wide)',
  transition: 'color var(--dur-fast) var(--ease-standard)',
});

export function Dock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useStore();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const path = location.pathname;
  // /app/review belongs to Flashcards; it has no destination of its own.
  const onCards = path.startsWith('/app/cards') || path.startsWith('/app/review');
  const onHome = path === '/app' || path === '/app/';
  const secondary = TOOLS.filter((t) => !PRIMARY.includes(t.id as typeof PRIMARY[number]));
  const onSecondary = secondary.some((t) => path.startsWith(`/app/${t.path}`)) || path.startsWith('/app/settings');

  // On the language too, not only the path. Choosing a workspace from the sheet
  // navigates Home — but from Home that is not a path change, so the sheet had
  // nothing to close it and sat there over the workspace it had just switched.
  React.useEffect(() => { setMoreOpen(false); }, [path, language]);

  React.useEffect(() => {
    if (!moreOpen) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const go = (to: string) => () => { playSound('tap'); navigate(to); };

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 45, border: 'none', padding: 0, background: 'var(--surface-overlay)', cursor: 'pointer' }}
        />
      )}

      {moreOpen && (
        <div
          role="menu"
          aria-label="More tools"
          style={{
            position: 'fixed', left: 0, right: 0, zIndex: 46,
            bottom: `calc(${DOCK_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
            padding: 8,
            paddingLeft: 'calc(8px + env(safe-area-inset-left, 0px))',
            paddingRight: 'calc(8px + env(safe-area-inset-right, 0px))',
            display: 'flex', flexDirection: 'column', gap: 2,
            background: 'var(--surface-raised)',
            borderTop: '1px solid var(--border)',
            boxShadow: 'var(--shadow-xl)',
            animation: 'lt-dock-rise var(--dur-base) var(--ease-out)',
          }}
        >
          <style>{'@keyframes lt-dock-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'}</style>
          {secondary.map((t) => (
            <MenuItem key={t.id} selected={path.startsWith(`/app/${t.path}`)} onClick={go(`/app/${t.path}`)}>
              <Icon name={t.icon} size={18} style={{ color: 'var(--text-muted)', flex: 'none' }} />
              <span style={{ flex: 1, minWidth: 0 }}>{t.label}</span>
              {!t.released && (
                <Badge tone="neutral" style={{ height: 16, padding: '0 6px', fontSize: 'var(--fs-9)', flex: 'none' }}>
                  Soon
                </Badge>
              )}
            </MenuItem>
          ))}
          <span style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          {/* Beside Settings, which is where it is on a desktop too — the rail
              has no phone equivalent, and this sheet is what holds the controls
              that belong to the app rather than to a screen. */}
          <LanguageMenu variant="row" />
          <MenuItem selected={path.startsWith('/app/settings')} onClick={go('/app/settings')}>
            <Icon name="settings" size={18} style={{ color: 'var(--text-muted)', flex: 'none' }} />
            <span style={{ flex: 1, minWidth: 0 }}>Settings</span>
          </MenuItem>
        </div>
      )}

      {/* Dark whatever the page theme, like the rail it replaces — and declared as
          such, so its foregrounds resolve against it rather than against the app. */}
      <nav
        data-theme="dark"
        aria-label="Tools"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 47,
          display: 'flex', alignItems: 'stretch',
          background: 'var(--surface-rail)',
          boxShadow: '0 -1px 0 var(--border)',
          // The home indicator on a modern iPhone sits under the bar; without
          // this the last few pixels of every tap target are behind it. Fixed
          // positioning is relative to the viewport, so the frame's insets do
          // not apply here and the bar states all three itself — the sides
          // matter in landscape, where the notch overlaps the end buttons.
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <button type="button" style={barItem(onHome)} aria-current={onHome || undefined} onClick={go('/app')}>
          <Icon name="house" size={20} />
          Home
        </button>
        <button type="button" style={barItem(onCards)} aria-current={onCards || undefined} onClick={go('/app/cards')}>
          <Icon name="layers" size={20} />
          Cards
        </button>
        <button
          type="button"
          style={barItem(onSecondary || moreOpen)}
          // Current when you are on something the sheet leads to, the same as
          // the other two — being an overflow does not make it less the place
          // you are. Not tied to `moreOpen`: having the sheet up is a state of
          // the menu, not of where you are.
          aria-current={onSecondary || undefined}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => { playSound('tap'); setMoreOpen((o) => !o); }}
        >
          <Icon name="ellipsis" size={20} />
          More
        </button>
      </nav>
    </>
  );
}
