import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Icon, Select, Switch, playSound, setSoundEnabled } from 'lingo-ds';
import { useChrome } from '../shell/chrome';
import { ConfirmDialog } from '../shell/ConfirmDialog';
import { useStore } from '../state/store';
import { buildBackup, downloadBackup, parseBackup, restoreBackup, BackupError } from '../data/backup';
import { WORKSPACES } from '../data/seed';
import { APP_VERSION } from '../legalNotices';
import { LegalDialog } from './LegalDialog';
import { FaqDialog } from './FaqDialog';
import { Diagnostics } from './Diagnostics';
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
  const { prefs, setPrefs, reset, reload, cards, decks } = useStore();
  const [legalOpen, setLegalOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [faqOpen, setFaqOpen] = React.useState(false);
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
          <Select
            label="Language track"
            value={prefs.language}
            // No flag here. It was forced when this was a native <option>,
            // which renders text and nothing else; now it is a choice. The
            // picker in the top bar is where the flags live, and the name was
            // always the identifier anyway.
            options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))}
            onChange={(v) => setPrefs({ language: v as typeof prefs.language })}
          />
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

        <Diagnostics />

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
