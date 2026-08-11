import * as React from 'react';
import { Button, Dialog, Icon } from 'lingo-ds';
import { useInstallState, type InstallRoute } from './install';

/**
 * How to get the app onto a home screen or a dock.
 *
 * A sheet of instructions is the last resort, not the first. Chromium hands
 * the page a real install dialog, so there the button is the whole feature and
 * this never opens. It exists for Safari, where installing is a proper feature
 * that only a person can drive.
 *
 * Steps rather than prose, because they are steps: the reader has the browser
 * open in front of them and is matching what is written to what is on screen.
 */

interface Steps { title: string; intro: string; steps: React.ReactNode[]; closing?: string }

/** The word Safari puts on the button, so the reader is matching a label. */
const share = (label: string) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
    <Icon name="share-2" size={14} style={{ color: 'var(--text-muted)' }} />
    <strong style={{ color: 'var(--text-strong)', fontWeight: 700 }}>{label}</strong>
  </span>
);

const b = (t: string) => <strong style={{ color: 'var(--text-strong)', fontWeight: 700 }}>{t}</strong>;

const CONTENT: Record<Exclude<InstallRoute, 'prompt' | 'none'>, Steps> = {
  ios: {
    title: 'Add to your Home Screen',
    intro: 'It runs from an icon like any other app — full screen, no address bar, and it keeps working without a connection.',
    steps: [
      <>Tap {share('Share')} in the browser bar. On iPhone it is at the bottom; if the bar is hidden, scroll up a little first.</>,
      <>Scroll the share sheet down, past the row of apps, until you find {b('Add to Home Screen')}. It may be under {b('Edit Actions')} if you have never used it.</>,
      <>Tap {b('Add to Home Screen')}.</>,
      <>The name is already {b('Lingo Toolbox')} — tap {b('Add')} to finish.</>,
    ],
    closing: 'Your decks, cards and notes stay exactly where they are: the installed app reads the same storage as this tab.',
  },
  'macos-safari': {
    title: 'Add to your Dock',
    intro: 'Safari can keep this in the Dock as its own app, with its own window and no browser chrome around it.',
    steps: [
      <>Open {share('Share')} in the toolbar, or the {b('File')} menu.</>,
      <>Choose {b('Add to Dock')}.</>,
      <>The name is already {b('Lingo Toolbox')} — click {b('Add')}.</>,
    ],
    closing: 'Needs macOS Sonoma or newer. On older versions Safari has no way to do this, and the tab is the app.',
  },
};

export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { route } = useInstallState();
  if (route === 'prompt' || route === 'none') return null;
  const content = CONTENT[route];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={content.title}
      description={content.intro}
      width={460}
      footer={<Button variant="secondary" onClick={onClose}>Done</Button>}
    >
      <ol
        style={{
          margin: 0, padding: 0, listStyle: 'none',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
        }}
      >
        {content.steps.map((step, i) => (
          <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
            {/* Numbered, because the order is the instruction. */}
            <span
              style={{
                flex: 'none', width: 24, height: 24, borderRadius: 999,
                background: 'var(--surface-raised)', color: 'var(--text-strong)',
                fontSize: 'var(--fs-12)', fontWeight: 'var(--fw-bold)' as React.CSSProperties['fontWeight'],
                display: 'grid', placeItems: 'center',
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 'var(--fs-15)', color: 'var(--text-body)', lineHeight: 'var(--lh-relaxed)' }}>
              {step}
            </span>
          </li>
        ))}
      </ol>

      {content.closing && (
        <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
          {content.closing}
        </p>
      )}
    </Dialog>
  );
}

/**
 * The entry point: a button where the browser can install, a button that opens
 * the instructions where it cannot, and nothing at all where it is already
 * installed or there is no way to.
 */
export function InstallAction({ block = false }: { block?: boolean }) {
  const { route, promptInstall } = useInstallState();
  const [sheet, setSheet] = React.useState(false);

  if (route === 'none') return null;

  return (
    <>
      <Button
        variant="secondary"
        block={block}
        iconLeft={<Icon name="download" size={16} />}
        onClick={() => (route === 'prompt' ? void promptInstall?.() : setSheet(true))}
      >
        Install app
      </Button>
      <InstallSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  );
}
