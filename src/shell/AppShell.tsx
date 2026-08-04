import * as React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Icon, IconButton, Input, SidebarItem, RailTile, StreakPill, Tooltip } from 'lingo-ds';
import { useStore } from '../state/store';
import { TOOLS } from '../data/seed';
import { LanguageMenu } from './LanguageMenu';
import markUrl from '../assets/mark-violet.svg';

const styles: Record<string, React.CSSProperties> = {
  frame: { display: 'flex', height: '100vh', background: 'var(--surface-app)', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' },
  rail: { width: 'var(--rail-width)', flex: 'none', background: 'var(--surface-rail)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: '10px 0 12px' },
  sidebar: { width: 'var(--sidebar-width)', flex: 'none', background: 'var(--surface-sidebar)', display: 'flex', flexDirection: 'column' },
  sidebarHead: { height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 0 16px', boxShadow: 'var(--shadow-xs)', flex: 'none' },
  sectionLabel: { fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 8px', marginBottom: 4 },
  userBar: { height: 56, flex: 'none', background: 'var(--ink-900)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '0 8px 0 10px' },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  topbar: { height: 'var(--topbar-height)', flex: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '0 16px', boxShadow: 'var(--shadow-xs)', position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'var(--blur-overlay)', background: 'color-mix(in oklab, var(--surface-app) 82%, transparent)' },
  topTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-15)', fontWeight: 800, color: 'var(--text-strong)' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto' },
};

export interface AppShellProps {
  title: React.ReactNode;
  titleIcon?: string;
  topRight?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, titleIcon, topRight, children }: AppShellProps) {
  const { decks, dueInDeck, streak, workspace, saveDeck, language } = useStore();
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
      <nav style={styles.rail} aria-label="Tools">
        <Link to="/" title="Lingo Toolbox home" style={{ display: 'block' }}>
          <img src={markUrl} alt="Lingo Toolbox" style={{ height: 43, width: 38 }} />
        </Link>
        <span style={{ width: 32, height: 2, background: 'var(--border)', borderRadius: 2, margin: '4px 0 6px' }} />

        {TOOLS.map((t) => (
          <Tooltip key={t.id} label={t.label} side="right">
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
        ))}

        <span style={{ flex: 1 }} />
        <Tooltip label="Settings" side="right">
          <IconButton label="Settings" active={settingsActive} onClick={() => navigate('/app/settings')}>
            <Icon name="settings" size={20} />
          </IconButton>
        </Tooltip>
      </nav>

      <aside style={styles.sidebar} aria-label="Decks">
        <div style={styles.sidebarHead}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)' }}>
            {settingsActive ? 'Settings' : activeTool.label}
          </span>
          <Badge tone="neutral">{workspace.flag} {workspace.code}</Badge>
        </div>

        <div style={{ padding: '10px 8px 6px' }}>
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

        <div style={styles.userBar}>
          <Avatar name="You" flag={workspace.flag} size="md" />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--fs-13)', fontWeight: 800, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace.name}
            </span>
            <span style={{ fontSize: 'var(--fs-11)', fontWeight: 600, color: 'var(--text-faint)' }}>
              {decks.length} {decks.length === 1 ? 'deck' : 'decks'} · stored locally
            </span>
          </div>
          <Tooltip label="Settings">
            <IconButton label="Settings" size="sm" onClick={() => navigate('/app/settings')}>
              <Icon name="settings" size={16} />
            </IconButton>
          </Tooltip>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <span style={styles.topTitle}>
            {titleIcon && <Icon name={titleIcon} size={18} style={{ color: 'var(--text-muted)' }} />}
            {title}
          </span>
          <span style={{ flex: 1 }} />
          {topRight}
          <span style={{ width: 4 }} />
          <LanguageMenu />
          <StreakPill days={streak} active={streak > 0} />
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
