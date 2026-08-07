import * as React from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Button, Dialog, Icon, IconButton, Input, SidebarItem, RailTile, StreakPill, Tooltip, useBreakpoint } from 'lingo-ds';
import { useStore } from '../state/store';
import { TOOLS } from '../data/seed';
import { LanguageMenu } from './LanguageMenu';
import { ChromeProvider, useChromeState } from './chrome';
import { markAppVisited } from '../data/visit';
import { flagUrl } from '../data/illustrations';
import { HelpMenu } from './HelpMenu';
import { Dock, DOCK_HEIGHT } from './Dock';
import stackUrl from 'lingo-ds/assets/logo/stack-violet.svg';
import markUrl from 'lingo-ds/assets/logo/mark-violet.svg';

const styles: Record<string, React.CSSProperties> = {
  // dvh, not vh: on a phone the URL bar is counted into vh, so a 100vh frame is
  // taller than the visible viewport and the bottom of every screen sits under
  // browser chrome until you scroll.
  // The insets are applied here rather than on the top bar so everything inside
  // inherits them, and because box-sizing is border-box the 100dvh frame gives
  // the space up rather than growing past the screen. The strip they leave
  // behind is the frame's own --surface-app, which is what the translucent iOS
  // status bar sits over. Left and right are for landscape, where the notch
  // takes a bite out of one side. All four are 0 on a desktop.
  frame: {
    display: 'flex', height: '100dvh', background: 'var(--surface-app)',
    fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
  },
  // --space-5, not --space-2: a rail item is a stack of tile, label and — on the
  // unreleased tools — a "Soon" badge, whose internal gaps are 4px and 2px. At
  // --space-2 the space *between* items was also 4px, so a badge sat as close to
  // the next tool as to its own, and the column read as one list of fifteen
  // things rather than six items. The outer gap is now 16px against an inner 4.
  rail: { width: 'var(--rail-width)', flex: 'none', background: 'var(--surface-rail)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)', padding: '10px 0 12px' },
  // The aside is the clipper that animates; the inner column keeps its full width
  // throughout so the deck list doesn't reflow on its way out.
  sidebar: { flex: 'none', background: 'var(--surface-sidebar)', overflow: 'hidden', transition: 'width var(--dur-base) var(--ease-standard)' },
  sidebarInner: { width: 'var(--sidebar-width)', height: '100%', display: 'flex', flexDirection: 'column' },
  sidebarHead: { height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 8px', boxShadow: 'var(--shadow-xs)', flex: 'none' },
  sectionLabel: { fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 8px', marginBottom: 4 },
  // --surface-sunken: one step below whatever the sidebar is, in either theme —
  // ink-900 under the dark sidebar's ink-800, paper-100 under the light one's
  // paper-50. It reads as part of the sidebar rather than as a slab of the rail
  // that wandered over, which is what --surface-rail made of it in light mode.
  // Following the theme also means it no longer needs to declare itself dark.
  userBar: { height: 56, flex: 'none', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '0 8px 0 10px' },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  topbar: { height: 'var(--topbar-height)', flex: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '0 16px', boxShadow: 'var(--shadow-xs)', position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'var(--blur-overlay)', background: 'color-mix(in oklab, var(--surface-app) 82%, transparent)' },
  // minWidth:0 so the title can shrink inside the flex row, and nowrap so a long
  // deck name truncates instead of wrapping the top bar onto two lines.
  topTitle: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 'var(--fs-15)', fontWeight: 800, color: 'var(--text-strong)', whiteSpace: 'nowrap' },
  crumb: { flex: 'none', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 700, borderRadius: 'var(--radius-xs)' },
  topTitleText: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
};

/**
 * The application frame: tool rail, deck sidebar, top bar, content pane.
 *
 * A layout route, not a wrapper each screen renders. Rendered per screen it was a
 * different component type at the same position on every navigation, so React
 * discarded and rebuilt the whole thing — no rail transition ever played, the
 * sidebar could not animate across a navigation, and the deck list forgot where
 * it was scrolled to. Screens now declare their chrome with `useChrome` and
 * `<TopRight>` from ./chrome.
 */
export function AppShell() {
  const { chrome, set } = useChromeState();
  const { title, titleIcon, parent, sidebar, streakInTopBar } = chrome;
  // Callback ref rather than useRef: <TopRight> portals into this node, and a
  // ref object's mutation would not re-render the consumers waiting for it.
  const [topRightSlot, setTopRightSlot] = React.useState<HTMLElement | null>(null);
  const chromeValue = React.useMemo(() => ({ set, slot: topRightSlot }), [set, topRightSlot]);
  const { decks, dueInDeck, streak, saveDeck, language, prefs, setPrefs, workspace, switching } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = React.useState('');

  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  // The rail is 72px — a fifth of a 375px phone, spent on chrome. On mobile a
  // bottom dock replaces it: navigation on a phone belongs where the thumb is,
  // not behind a button in the top corner it can barely reach.
  //
  // The deck sidebar goes too. It is a desktop convenience — on a phone the
  // Flashcards screen *is* the deck list, and the breadcrumb already goes there.
  const showSidebar = sidebar && !isMobile;

  // Reaching the shell is what counts as having used the app, and it is what
  // makes `/` skip the landing page next time. Marked here rather than on the
  // landing page because bouncing off the marketing site decides nothing.
  React.useEffect(() => { markAppVisited(); }, []);

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
    if (!showSidebar) return undefined;
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
  }, [showSidebar, toggleSidebar]);

  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);
  const toggleShortcut = isMac ? '⌘B' : 'Ctrl+B';

  /**
   * Naming a new deck. A dialog rather than window.prompt, which throws outright
   * in environments that decline to implement it — the button did nothing at
   * all, and the error went nowhere because the handler was async.
   */
  const [naming, setNaming] = React.useState(false);
  const [deckName, setDeckName] = React.useState('');

  const newDeck = async () => {
    const name = deckName.trim();
    if (!name) return;
    const id = `deck-${Date.now().toString(36)}`;
    await saveDeck({
      id,
      language,
      name,
      accent: 'var(--tool-flashcards)',
      tags: [],
      createdAt: Date.now(),
    });
    setNaming(false);
    setDeckName('');
    navigate(`/app/cards/${id}`);
  };

  return (
    <ChromeProvider value={chromeValue}>
    <div style={styles.frame}>
      {/* The rail keeps a dark surface in light mode — that is deliberate, and the
          light scope sets --surface-rail to an ink step to say so. But only the
          background was following that decision: every foreground token inside
          still resolved to its light value, so in light mode the active label and
          the pip came out ink-900 on an ink-900 rail at 1:1, and the active icon
          white on near-white paper at 1.07:1. Declaring the rail a dark island
          settles it in one place — the design system supports either scope nesting
          inside the other, and this is what that is for. */}
      {/* Desktop and tablet only — the phone gets <Dock /> at the bottom. */}
      {!isMobile && (
      <nav className="lt-rail" data-theme="dark" aria-label="Tools" style={styles.rail}>
        {/* The app's home, not the marketing page. A logo at the top of a
            product's own nav is the way back to its start, and the rail's Home
            tile a few pixels below already means exactly that — two adjacent
            marks that looked identical and went to different places. Getting to
            the marketing site is the About button's job. */}
        <Link to="/app" title="Home" style={{ display: 'block' }}>
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
                size={isMobile ? 44 : 38}
                quiet
                showLabel
                active={activeTool.id === t.id && !settingsActive}
                onClick={() => navigate(`/app/${t.path}`)}
              />
            </Tooltip>
            {!t.released && (
              // Sized well below the Badge default: at 36.8px it was as wide as
              // the 38px tile above it, so the marker read as loud as the tool it
              // was qualifying. --fs-8 is the scale's floor, added for exactly
              // this kind of micro-label on narrow chrome, and the box is pulled
              // in to match. Tighter tracking too — --ls-wide exists to open up
              // caps for reading, and this is a stamp, not a word.
              <Badge
                tone="neutral"
                style={{ height: 11, padding: '0 3px', fontSize: 'var(--fs-8)', letterSpacing: 'var(--ls-normal)' }}
              >
                Soon
              </Badge>
            )}
          </div>
        ))}

        <span style={{ flex: 1 }} />
        <LanguageMenu variant="rail" />
        <Tooltip label="Settings" side="right">
          <IconButton label="Settings" size={isMobile ? 'lg' : 'md'} active={settingsActive} onClick={() => navigate('/app/settings')}>
            <Icon name="settings" size={20} />
          </IconButton>
        </Tooltip>
      </nav>
      )}

      {showSidebar && (
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
              onClick={() => { setDeckName(''); setNaming(true); }}
              aria-label="New deck"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'grid' }}
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
              <span style={{ padding: '8px', fontSize: 'var(--fs-12)', color: 'var(--text-muted)', lineHeight: 'var(--lh-normal)' }}>
                {search ? 'No deck matches that.' : 'No decks yet. Add one with the plus above.'}
              </span>
            )}
          </div>
        </div>

        {/* No accounts exist, so this bar carries what is actually true about the
            data rather than a user identity — and not the workspace name, which
            the picker owns. */}
        <div style={styles.userBar}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-12)', fontWeight: 600, color: 'var(--text-muted)', lineHeight: 'var(--lh-normal)' }}>
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

      {switching && (
        <div
          // aria-live rather than a role: this is a status being announced, not
          // a dialog to be dealt with, and nothing here can be interacted with.
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'grid', placeItems: 'center', background: 'var(--surface-app)',
            animation: 'lt-ws-in var(--dur-fast) var(--ease-out)',
          }}
        >
          <style>
            {'@keyframes lt-ws-in{from{opacity:0}to{opacity:1}}'
              + '@keyframes lt-ws-mark{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:none}}'
              + '@keyframes lt-ws-sweep{from{transform:translateX(-100%)}to{transform:translateX(100%)}}'}
          </style>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)' }}>
            <img
              src={flagUrl(workspace.flagHex)}
              alt=""
              width={48}
              height={48}
              style={{ display: 'block', animation: 'lt-ws-mark var(--dur-base) var(--ease-out)' }}
            />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-15)', fontWeight: 800, color: 'var(--text-strong)' }}>
              Loading {switching} workspace
            </span>
            {/* An indeterminate sweep, not a progress bar: there is no progress
                to report, and a bar that fills would be describing work that
                has already finished. */}
            <span style={{ width: 120, height: 3, borderRadius: 2, background: 'var(--surface-raised)', overflow: 'hidden' }}>
              <span
                style={{
                  display: 'block', width: '100%', height: '100%', borderRadius: 2,
                  background: workspace.color,
                  animation: 'lt-ws-sweep 620ms var(--ease-standard) infinite',
                }}
              />
            </span>
          </div>
        </div>
      )}

      <main style={styles.main}>
        <header style={styles.topbar}>
          {/* The rail carried the brand on desktop; on a phone there is no rail, so
              the shell had no mark on it anywhere. The reduced mark, not the
              stacked lockup or the wordmark — the guide puts a 60px floor on one
              and a 96px minimum width on the other, and this bar is 48px tall.
              Goes to Home, like the rail's logo. */}
          {isMobile && (
            <Link to="/app" title="Home" style={{ display: 'grid', flex: 'none' }} aria-label="Home">
              <img src={markUrl} alt="Lingo Toolbox" style={{ height: 30, width: 26, display: 'block' }} />
            </Link>
          )}
          {!isMobile && showSidebar && (
            <Tooltip label={collapsed ? 'Show decks' : 'Hide decks'} shortcut={toggleShortcut}>
              <IconButton label={collapsed ? 'Show decks' : 'Hide decks'} style={{ flex: 'none' }} onClick={toggleSidebar}>
                <Icon name="panel-left" size={18} />
              </IconButton>
            </Tooltip>
          )}
          <span style={styles.topTitle}>
            {/* Not on a phone. The dock already says which tool you are in, and
                the icon was costing 26px of a bar where the deck name had been
                squeezed to "E..". */}
            {titleIcon && !isMobile && <Icon name={titleIcon} size={18} style={{ color: 'var(--text-muted)', flex: 'none' }} />}
            {/* The way back up. Muted so the current screen stays the loudest
                thing in the bar, and a real link so it is keyboard-reachable and
                opens in a new tab like any other. */}
            {parent && !isMobile && (
              <>
                <NavLink to={parent.to} style={styles.crumb}>{parent.label}</NavLink>
                <Icon name="chevron-right" size={15} style={{ color: 'var(--text-muted)', margin: '0 -2px', flex: 'none' }} aria-hidden="true" />
              </>
            )}
            <span style={styles.topTitleText}>{title}</span>
          </span>
          <span style={{ flex: 1 }} />
          {/* Filled by whichever screen renders <TopRight>; empty otherwise. */}
          <span ref={setTopRightSlot} style={{ display: 'contents' }} />
          <span style={{ width: 4 }} />
          {/* Both are secondary to the screen's own actions, and on a phone the
              top bar has room for the title and about two controls. The streak is
              on Home's hero anyway, and the marketing link lives in the rail's
              logo, which the menu opens. */}
          {streakInTopBar && !isMobile && <StreakPill days={streak} active={streak > 0} size="sm" />}
          {/* Three things that are not part of doing the work — what this is, how
              it behaves, what the keys do — behind one question mark rather than
              three competing glyphs. Still off on a phone, where the bar has room
              for the title and about two controls; Settings carries About and FAQ
              for that case, and shortcuts do not apply without a keyboard. */}
          {!isMobile && <HelpMenu />}
        </header>
        {/* The dock is fixed, so the scroller has to stop short of it — otherwise
            the last card on every screen sits under the bar. */}
        <div style={{ ...styles.body, paddingBottom: isMobile ? `calc(${DOCK_HEIGHT}px + env(safe-area-inset-bottom, 0px))` : undefined }}>
          <Outlet />
        </div>
      </main>

      <Dialog
        open={naming}
        onClose={() => setNaming(false)}
        title="New deck"
        description={`A deck holds words you are practising in ${workspace.name}.`}
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNaming(false)}>Cancel</Button>
            <Button sound={false} onClick={newDeck} disabled={!deckName.trim()}>Create deck</Button>
          </>
        }
      >
        <div style={{ paddingBottom: 'var(--space-4)' }}>
          <Input
            label="Name"
            placeholder="Everyday phrases"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            // Enter submits, the way it would have in the prompt this replaces.
            onKeyDown={(e) => { if (e.key === 'Enter' && deckName.trim()) void newDeck(); }}
          />
        </div>
      </Dialog>

      {isMobile && <Dock />}
    </div>
    </ChromeProvider>
  );
}
