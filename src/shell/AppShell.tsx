import * as React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Icon, IconButton, Input, SidebarItem, RailTile, StreakPill, Tooltip } from 'lingo-ds';
import { useStore } from '../state/store';
import { TOOLS } from '../data/seed';
import { LanguageMenu } from './LanguageMenu';
import stackUrl from 'lingo-ds/assets/logo/stack-violet.svg';

const styles: Record<string, React.CSSProperties> = {
  frame: { display: 'flex', height: '100vh', background: 'var(--surface-app)', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' },
  rail: { width: 'var(--rail-width)', flex: 'none', background: 'var(--surface-rail)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: '10px 0 12px' },
  // The aside is the clipper that animates; the inner column keeps its full width
  // throughout so the deck list doesn't reflow on its way out.
  sidebar: { flex: 'none', background: 'var(--surface-sidebar)', overflow: 'hidden', transition: 'width var(--dur-base) var(--ease-standard)' },
  sidebarInner: { width: 'var(--sidebar-width)', height: '100%', display: 'flex', flexDirection: 'column' },
  sidebarHead: { height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 8px', boxShadow: 'var(--shadow-xs)', flex: 'none' },
  sectionLabel: { fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 8px', marginBottom: 4 },
  userBar: { height: 56, flex: 'none', background: 'var(--ink-900)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '0 8px 0 10px' },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  topbar: { height: 'var(--topbar-height)', flex: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '0 16px', boxShadow: 'var(--shadow-xs)', position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'var(--blur-overlay)', background: 'color-mix(in oklab, var(--surface-app) 82%, transparent)' },
  topTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-15)', fontWeight: 800, color: 'var(--text-strong)' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto' },
};

export interface AppShellProps {
  /**
   * Names the object on screen — a deck, a session — not the tool. The rail
   * already says which tool you're in, so a screen with nothing of its own to
   * name (Home) omits this rather than echoing the rail.
   */
  title?: React.ReactNode;
  titleIcon?: string;
  topRight?: React.ReactNode;
  /**
   * The deck sidebar. Tools that have nothing to do with decks pass `false` —
   * chrome that lists decks beside a screen which cannot use them is noise, and
   * hiding it shouldn't be left to the reader to do by hand every time.
   */
  sidebar?: boolean;
  /**
   * The streak in the top bar. Home sets this false because it shows the streak
   * large in its own hero, and one screen does not need to say it twice.
   */
  streakInTopBar?: boolean;
  children: React.ReactNode;
}

export function AppShell({ title, titleIcon, topRight, sidebar = true, streakInTopBar = true, children }: AppShellProps) {
  const { decks, dueInDeck, streak, saveDeck, language, prefs, setPrefs } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = React.useState('');

  // /app/review belongs to Flashcards — it has no rail tile of its own.
  const path = location.pathname.replace('/app/review', '/app/cards');
  const activeTool = TOOLS.find((t) => t.path !== 'home' && path.startsWith(`/app/${t.path}`)) ?? TOOLS[0];
  const settingsActive = location.pathname.startsWith('/app/settings');

  const visibleDecks = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? decks.filter((d) => d.name.toLowerCase().includes(q)) : decks;
  }, [decks, search]);

  const collapsed = prefs.sidebarCollapsed;
  const toggleSidebar = React.useCallback(
    () => setPrefs({ sidebarCollapsed: !prefs.sidebarCollapsed }),
    [prefs.sidebarCollapsed, setPrefs],
  );

  // Cmd/Ctrl+B, the near-universal binding for this. The whole point is to use it
  // mid-flow, so it is global rather than a button you have to go and find —
  // except while typing, where the browser's own bold would be the expectation.
  React.useEffect(() => {
    if (!sidebar) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'b' && e.key !== 'B') return;
      if (!e.metaKey && !e.ctrlKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      toggleSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebar, toggleSidebar]);

  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);
  const toggleShortcut = isMac ? '⌘B' : 'Ctrl+B';

  const newDeck = async () => {
    const name = window.prompt('Name the deck');
    if (!name?.trim()) return;
    const id = `deck-${Date.now().toString(36)}`;
    await saveDeck({
      id,
      language,
      name: name.trim(),
      accent: 'var(--tool-flashcards)',
      tags: [],
      createdAt: Date.now(),
    });
    navigate(`/app/cards/${id}`);
  };

  return (
    <div style={styles.frame}>
      {/* The rail keeps a dark surface in light mode — that is deliberate, and the
          light scope sets --surface-rail to an ink step to say so. But only the
          background was following that decision: every foreground token inside
          still resolved to its light value, so in light mode the active label and
          the pip came out ink-900 on an ink-900 rail at 1:1, and the active icon
          white on near-white paper at 1.07:1. Declaring the rail a dark island
          settles it in one place — the design system supports either scope nesting
          inside the other, and this is what that is for. */}
      <nav className="lt-rail" data-theme="dark" style={styles.rail} aria-label="Tools">
        <Link to="/" title="Lingo Toolbox home" style={{ display: 'block' }}>
          <img src={stackUrl} alt="Lingo Toolbox" style={{ height: 63, width: 44 }} />
        </Link>
        <span style={{ width: 32, height: 2, background: 'var(--border)', borderRadius: 2, margin: '4px 0 6px' }} />

        {TOOLS.map((t) => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%', flex: 'none' }}>
            <Tooltip label={t.label} side="right">
              <RailTile
                label={t.short}
                icon={<Icon name={t.icon} size={18} />}
                color="var(--surface-raised)"
                size={38}
                quiet
                showLabel
                active={activeTool.id === t.id && !settingsActive}
                onClick={() => navigate(`/app/${t.path}`)}
              />
            </Tooltip>
            {!t.released && (
              // Sized down from the Badge default so it sits under the rail label
              // without outweighing it — at --fs-9, the scale's floor, added for
              // exactly this kind of micro-label on narrow chrome.
              <Badge tone="neutral" style={{ height: 12, padding: '0 4px', fontSize: 'var(--fs-9)' }}>
                Soon
              </Badge>
            )}
          </div>
        ))}

        <span style={{ flex: 1 }} />
        <Tooltip label="Settings" side="right">
          <IconButton label="Settings" active={settingsActive} onClick={() => navigate('/app/settings')}>
            <Icon name="settings" size={20} />
          </IconButton>
        </Tooltip>
      </nav>

      {sidebar && (
      <aside
        style={{ ...styles.sidebar, width: collapsed ? 0 : 'var(--sidebar-width)' }}
        aria-label="Decks"
      >
        {/* visibility rather than display so the width can animate, and unlike
            clipping alone it takes the deck list out of the tab order once the
            panel has finished closing. Transitioning it defers the flip to the
            end of the slide out, and applies it immediately on the way in. */}
        <div
          style={{
            ...styles.sidebarInner,
            visibility: collapsed ? 'hidden' : 'visible',
            transition: 'visibility var(--dur-base) var(--ease-standard)',
          }}
        >
        {/* This 48px band exists to align the sidebar with the top bar. It holds
            search rather than a heading: the rail already names the tool and the
            top-right picker already names the workspace, so a label here could
            only repeat one of them. */}
        <div style={styles.sidebarHead}>
          <Input
            placeholder="Search decks…"
            size="sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconLeft={<Icon name="search" size={14} />}
          />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 8px 12px' }}>
          <div style={{ ...styles.sectionLabel, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Decks</span>
            <button
              type="button"
              onClick={newDeck}
              aria-label="New deck"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', padding: 0, display: 'grid' }}
            >
              <Icon name="plus" size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visibleDecks.map((d) => {
              const due = dueInDeck(d.id).length;
              return (
                <SidebarItem
                  key={d.id}
                  label={d.name}
                  meta={due ? String(due) : ''}
                  muted={!due}
                  active={location.pathname === `/app/cards/${d.id}`}
                  icon={<span style={{ width: 8, height: 8, borderRadius: 3, background: d.accent, display: 'block' }} />}
                  onClick={() => navigate(`/app/cards/${d.id}`)}
                />
              );
            })}
            {!visibleDecks.length && (
              <span style={{ padding: '8px', fontSize: 'var(--fs-12)', color: 'var(--text-faint)', lineHeight: 'var(--lh-normal)' }}>
                {search ? 'No deck matches that.' : 'No decks yet. Add one with the plus above.'}
              </span>
            )}
          </div>
        </div>

        {/* No accounts exist, so this bar carries what is actually true about the
            data rather than a user identity — and not the workspace name, which
            the picker owns. */}
        <div style={styles.userBar}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-12)', fontWeight: 600, color: 'var(--text-faint)', lineHeight: 'var(--lh-normal)' }}>
            {decks.length} {decks.length === 1 ? 'deck' : 'decks'} · stored in this browser
          </span>
          <Tooltip label="Settings">
            <IconButton label="Settings" size="sm" onClick={() => navigate('/app/settings')}>
              <Icon name="settings" size={16} />
            </IconButton>
          </Tooltip>
        </div>
        </div>
      </aside>
      )}

      <main style={styles.main}>
        <header style={styles.topbar}>
          {sidebar && (
            <Tooltip label={collapsed ? 'Show decks' : 'Hide decks'} shortcut={toggleShortcut}>
              <IconButton label={collapsed ? 'Show decks' : 'Hide decks'} onClick={toggleSidebar}>
                <Icon name="panel-left" size={18} />
              </IconButton>
            </Tooltip>
          )}
          <span style={styles.topTitle}>
            {titleIcon && <Icon name={titleIcon} size={18} style={{ color: 'var(--text-muted)' }} />}
            {title}
          </span>
          <span style={{ flex: 1 }} />
          {topRight}
          <span style={{ width: 4 }} />
          <LanguageMenu />
          {streakInTopBar && <StreakPill days={streak} active={streak > 0} size="sm" />}
          <Tooltip label="Marketing site">
            <NavLink to="/" style={{ display: 'grid' }} aria-label="Marketing site">
              <IconButton label="About Lingo Toolbox">
                <Icon name="circle-question-mark" size={18} />
              </IconButton>
            </NavLink>
          </Tooltip>
        </header>
        <div style={styles.body}>{children}</div>
      </main>
    </div>
  );
}
