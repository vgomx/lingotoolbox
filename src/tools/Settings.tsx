import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Icon, Select, Switch, playSound, setSoundEnabled } from 'lingo-ds';
import { useChrome } from '../shell/chrome';
import { useLanguagePicker } from '../shell/languagePicker';
import { ConfirmDialog } from '../shell/ConfirmDialog';
import { useStore } from '../state/store';
import { InstallAction } from '../shell/InstallSheet';
import { useInstallState } from '../shell/install';
import { buildBackup, downloadBackup, parseBackup, restoreBackup, BackupError } from '../data/backup';
import { flagUrl } from '../data/illustrations';
import { APP_VERSION } from '../legalNotices';
import { LegalDialog } from './LegalDialog';
import { FaqDialog } from './FaqDialog';
import markUrl from 'lingo-ds/assets/logo/mark-violet.svg';

/**
 * The commit this bundle was built from, or 'dev' outside a git checkout.
 *
 * Read through a guard rather than used bare: __BUILD__ is a define, so it does
 * not exist in any context Vite has not substituted it in, and a bare reference
 * would throw rather than degrade.
 */
const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

const page: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
};

export function Settings() {
  const { prefs, setPrefs, reset, reload, cards, decks, workspace } = useStore();
  const openLanguages = useLanguagePicker();
  const [trackHovered, setTrackHovered] = React.useState(false);
  const [legalOpen, setLegalOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [faqOpen, setFaqOpen] = React.useState(false);
  // 'none' covers both "already installed" and "this browser cannot".
  const installable = useInstallState().route !== 'none';
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [status, setStatus] = React.useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const doExport = async () => {
    try {
      downloadBackup(await buildBackup());
      setStatus({ tone: 'ok', text: 'Backup saved to your downloads.' });
    } catch {
      setStatus({ tone: 'bad', text: 'Could not build the backup.' });
    }
  };

  const doImport = async (file: File) => {
    try {
      const counts = await restoreBackup(parseBackup(await file.text()));
      await reload();
      const added = counts.decks + counts.cards + counts.reviews + counts.notes;
      const skipped = counts.skipped.decks + counts.skipped.cards + counts.skipped.reviews;
      setStatus({
        tone: 'ok',
        text: added === 0 && skipped > 0
          ? 'Everything in that backup is already here — nothing changed.'
          : `Restored ${counts.decks} decks and ${counts.cards} cards`
            + `${skipped > 0 ? `. ${skipped} records were already here and were left alone.` : '.'}`,
      });
    } catch (err) {
      // BackupError messages are written for the reader; anything else is not.
      setStatus({
        tone: 'bad',
        text: err instanceof BackupError ? err.message : 'That file could not be read.',
      });
    }
  };

  useChrome({ title: 'Settings', titleIcon: 'settings' });

  return (
    <>
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
            hint="Easier on the eyes in a bright room."
            checked={prefs.theme === 'light'}
            onChange={(next) => setPrefs({ theme: next ? 'light' : 'dark' })}
          />
        </Card>

        <Card title="Reviewing">
          {/*
            * The third way into the language selector, and no longer a second
            * implementation of it.
            *
            * This was a <Select> of names, which made it the one place the
            * choice was made without a flag — and, worse, it wrote the
            * preference directly instead of going through setLanguage, so it
            * skipped the switching overlay the rail and the dock both show and
            * left whatever screen you were on pointed at the old workspace.
            * It opens the same dialog now.
            */}
          <button
            type="button"
            onClick={openLanguages ?? undefined}
            disabled={!openLanguages}
            aria-haspopup="dialog"
            onMouseEnter={() => setTrackHovered(true)}
            onMouseLeave={() => setTrackHovered(false)}
            onFocus={() => setTrackHovered(true)}
            onBlur={() => setTrackHovered(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%',
              padding: '10px 12px', cursor: 'pointer', font: 'inherit', textAlign: 'left',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              background: trackHovered ? 'var(--surface-hover)' : 'var(--surface-sunken)',
              transition: 'var(--transition-control)',
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
                Language track
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, color: 'var(--text-strong)', fontSize: 'var(--fs-16)' }}>
                <img src={flagUrl(workspace.flagHex)} alt="" width={20} height={20} style={{ display: 'block', flex: 'none' }} />
                {workspace.name}
              </span>
            </span>
            <Icon name="chevron-down" size={18} style={{ color: 'var(--text-muted)', flex: 'none' }} />
          </button>
          <Select
            label="Cards per session"
            value={String(prefs.sessionLimit)}
            options={['10', '20', '40', '100'].map((v) => ({ value: v, label: `${v} cards` }))}
            onChange={(v) => setPrefs({ sessionLimit: Number(v) })}
          />
          <Switch
            label="Show keyboard shortcuts"
            hint="Numbers 1–4 on the grade buttons."
            checked={prefs.showShortcuts}
            onChange={(next) => setPrefs({ showShortcuts: next })}
          />
          <Switch
            label="Sound"
            hint="Short tones when a card flips and when you grade it."
            checked={prefs.sound}
            onChange={(next) => {
              setPrefs({ sound: next });
              // Switching it on is the one moment a sound is worth playing
              // unprompted — it is the answer to "what will this sound like?".
              if (next) { setSoundEnabled(true); playSound('toggle'); }
            }}
          />
        </Card>

        <Card title="Local data" subtitle={`${decks.length} decks · ${cards.length} cards in this workspace`}>
          <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            A backup is a single JSON file holding every deck, card and review, across all four
            workspaces. Restoring adds back anything missing and leaves what is already here
            alone, so importing the same file twice is harmless.
          </p>
          <div style={{ display: 'flex', gap: 'var(--gap-inline)', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={15} />} onClick={doExport}>
              Export a backup
            </Button>
            <Button variant="ghost" size="sm" iconLeft={<Icon name="upload" size={15} />} onClick={() => fileInput.current?.click()}>
              Restore from a backup
            </Button>
            {/* The input is the only way to get a file, but it is not a control
                anyone should see — the two buttons above are. */}
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Cleared so choosing the same file twice fires change again.
                e.target.value = '';
                if (file) void doImport(file);
              }}
            />
          </div>

          {status && (
            <p style={{ margin: 0, fontSize: 'var(--fs-13)', lineHeight: 'var(--lh-relaxed)', color: status.tone === 'bad' ? 'var(--danger-text, var(--danger))' : 'var(--text-muted)' }}>
              {status.text}
            </p>
          )}

          {/* The warning sits with the button rather than at the top of the card,
              where it now reads as a caption to Export. */}
          <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            Resetting clears every deck, card and review in this browser and restores the
            starter decks. Export first if you want any of it back.
          </p>
          <div>
            <Button
              variant="danger"
              iconLeft={<Icon name="trash-2" size={16} />}
              onClick={() => setResetting(true)}
            >
              Reset local data
            </Button>
          </div>
        </Card>

        {/*
          * Only rendered where there is somewhere to go: InstallAction returns
          * nothing once the app is running from a home screen or a dock, and
          * on browsers with no way to install at all. A card that said "already
          * installed" would be a row of settings explaining itself.
          */}
        {installable && (
          <Card title="Install" subtitle="Run it from your home screen or dock, without a browser around it">
            <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
              Nothing is downloaded from a store and nothing moves: it is the same app reading the
              same local data, in its own window.
            </p>
            <div style={{ display: 'flex' }}>
              <InstallAction />
            </div>
          </Card>
        )}

        <Card title="About">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
            <img src={markUrl} alt="" width={44} height={50} style={{ flex: 'none' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)' }}>
                Lingo Toolbox
              </span>
              {/*
                * The build, not just the version.
                *
                * A service worker can serve an old build for a long time, and an
                * installed app has no address bar to reload from — so "is this
                * running the fix or the version before it" is a question that
                * otherwise gets answered by hunting for a visual change and
                * hoping the one you picked had actually shipped. It is the
                * commit, so it can be compared against the repository rather
                * than only against another device.
                */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-11)', color: 'var(--text-muted)' }}>
                Version {APP_VERSION} · build {BUILD}
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
            {/* The help menu that carries these lives in the top bar, which is
                hidden on a phone — so both of its reachable entries are repeated
                here. Shortcuts are not: there is no keyboard to shortcut. */}
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm" iconLeft={<Icon name="house" size={15} />}>About Lingo Toolbox</Button>
            </Link>
            <Button variant="ghost" size="sm" iconLeft={<Icon name="circle-question-mark" size={15} />} onClick={() => setFaqOpen(true)}>
              FAQ
            </Button>
            <a href="https://github.com/vgomx/lingotoolbox" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="sm" iconLeft={<Icon name="git-branch" size={15} />}>Source</Button>
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

        <ConfirmDialog
          open={resetting}
          title="Reset local data?"
          description="Every deck, card and review in this browser goes, and the starter decks come back. This cannot be undone — export first if you want any of it back."
          confirmLabel="Reset everything"
          onCancel={() => setResetting(false)}
          onConfirm={async () => { setResetting(false); await reset(); }}
        />

        <LegalDialog open={legalOpen} onClose={() => setLegalOpen(false)} />
        <FaqDialog open={faqOpen} onClose={() => setFaqOpen(false)} />
      </div>
    </>
  );
}
