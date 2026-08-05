import * as React from 'react';
import { Button, Card, Icon, Select, Switch } from 'lingo-ds';
import { AppShell } from '../shell/AppShell';
import { useStore } from '../state/store';
import { WORKSPACES } from '../data/seed';
import { APP_VERSION } from '../legalNotices';
import { LegalDialog } from './LegalDialog';
import markUrl from 'lingo-ds/assets/logo/mark-violet.svg';

const page: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
};

export function Settings() {
  const { prefs, setPrefs, reset, cards, decks } = useStore();
  const [legalOpen, setLegalOpen] = React.useState(false);

  return (
    <AppShell title="Settings" titleIcon="settings" sidebar={false}>
      <div style={page}>
        <header>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15 }}>
            Settings
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            Everything is stored in this browser. There is no account and nothing is sent anywhere.
          </p>
        </header>

        <Card title="Appearance">
          <Switch
            label="Light theme"
            hint="Dark is the product default; light is the same tokens retuned."
            checked={prefs.theme === 'light'}
            onChange={(next) => setPrefs({ theme: next ? 'light' : 'dark' })}
          />
        </Card>

        <Card title="Reviewing">
          <Select
            label="Language track"
            value={prefs.language}
            options={WORKSPACES.map((w) => ({ value: w.code, label: `${w.flag}  ${w.name}` }))}
            onChange={(e) => setPrefs({ language: e.target.value as typeof prefs.language })}
          />
          <Select
            label="Cards per session"
            value={String(prefs.sessionLimit)}
            options={['10', '20', '40', '100'].map((v) => ({ value: v, label: `${v} cards` }))}
            onChange={(e) => setPrefs({ sessionLimit: Number(e.target.value) })}
          />
          <Switch
            label="Show keyboard shortcuts"
            hint="Numbers 1–4 on the grade buttons."
            checked={prefs.showShortcuts}
            onChange={(next) => setPrefs({ showShortcuts: next })}
          />
        </Card>

        <Card title="Local data" subtitle={`${decks.length} decks · ${cards.length} cards in this workspace`}>
          <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            Resetting clears every deck, card and review in this browser and restores the starter decks.
          </p>
          <div>
            <Button
              variant="danger"
              iconLeft={<Icon name="trash-2" size={16} />}
              onClick={async () => {
                if (window.confirm('Clear all local data and restore the starter decks? This cannot be undone.')) {
                  await reset();
                }
              }}
            >
              Reset local data
            </Button>
          </div>
        </Card>

        <Card title="About">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
            <img src={markUrl} alt="" width={44} height={50} style={{ flex: 'none' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)' }}>
                Lingo Toolbox
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-11)', color: 'var(--text-muted)' }}>
                Version {APP_VERSION}
              </span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            A set of tools for practising a language you are already learning, rather than a
            course. Open source under the MIT licence, and built on{' '}
            <a href="https://github.com/vgomx/lingo-ds" style={{ color: 'var(--text-link)' }}>lingo-ds</a>,
            its design system.
          </p>

          <p style={{ margin: 0, fontSize: 'var(--fs-12)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            Made by <a href="https://vitorgomes.design" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)' }}>Vitor Gomes</a>.
            {' '}© 2026, MIT licensed.
          </p>

          <div style={{ display: 'flex', gap: 'var(--gap-inline)', flexWrap: 'wrap' }}>
            <a href="https://github.com/vgomx/lingotoolbox" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm" iconLeft={<Icon name="git-branch" size={15} />}>Source</Button>
            </a>
            <a href="https://vgomx.github.io/lingo-ds/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="sm">Design system</Button>
            </a>
          </div>
        </Card>

        <Card title="Legal" subtitle="Licences of the software this app ships">
          <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            Lingo Toolbox stands on other people's work. Their licences require their notices to
            travel with it, so they are reproduced in full here.
          </p>
          <div>
            <Button variant="secondary" size="sm" iconLeft={<Icon name="scroll-text" size={15} />} onClick={() => setLegalOpen(true)}>
              Open-source acknowledgements
            </Button>
          </div>
        </Card>

        <LegalDialog open={legalOpen} onClose={() => setLegalOpen(false)} />
      </div>
    </AppShell>
  );
}
