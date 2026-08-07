import * as React from 'react';
import { Button, Card, Icon } from 'lingo-ds';

/**
 * What this build is, and what the browser thinks the screen is.
 *
 * Here because a layout bug on an installed phone has been costing a round trip
 * each time just to establish the basics — which build is running, and whether
 * the dock is where it thinks it is. There is no address bar in a standalone
 * app to check a version from, and a service worker can serve an old bundle for
 * days, so "did the fix reach you" was previously answered by looking for some
 * visual change and hoping it had shipped in the same commit.
 *
 * Every number here is read live rather than stored. `bottom` is the one that
 * matters: on a correct layout it equals the viewport height, and the gap under
 * the dock is exactly the difference.
 */
/** Resolves an env() by putting it on a throwaway element and reading it back. */
function measureEnv(name: string): string {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;visibility:hidden;padding-bottom:env(${name}, 0px)`;
  document.body.appendChild(probe);
  const v = getComputedStyle(probe).paddingBottom;
  probe.remove();
  return v || '0px';
}

function useReadings(open: boolean) {
  const [readings, setReadings] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return undefined;
    const read = () => {
      const dock = document.querySelector('nav[aria-label="Tools"]');
      const r = dock?.getBoundingClientRect();
      const vv = window.visualViewport;
      setReadings({
        build: typeof __BUILD__ === 'string' ? __BUILD__ : 'dev',
        'layout viewport': `${window.innerWidth} x ${window.innerHeight}`,
        'visual viewport': vv ? `${Math.round(vv.width)} x ${Math.round(vv.height)}` : 'unsupported',
        screen: `${window.screen.width} x ${window.screen.height}`,
        'dock bottom': r ? String(Math.round(r.bottom)) : 'no dock (desktop)',
        // The whole bug in one number: anything but 0 is the gap.
        'gap under dock': r ? String(Math.round(window.innerHeight - r.bottom)) : '—',
        'dock inset': getComputedStyle(document.documentElement).getPropertyValue('--dock-inset').trim() || '0px',
        // env() cannot be read off an element that is not using it, so this
        // measures one that is. The raw inset, before --dock-inset gates it.
        'env(safe bottom)': measureEnv('safe-area-inset-bottom'),
        'env(safe top)': measureEnv('safe-area-inset-top'),
        standalone: String(
          window.matchMedia('(display-mode: standalone)').matches
          || (window.navigator as unknown as { standalone?: boolean }).standalone === true,
        ),
      });
    };
    read();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', read);
    window.addEventListener('resize', read);
    window.addEventListener('scroll', read, true);
    return () => {
      vv?.removeEventListener('resize', read);
      window.removeEventListener('resize', read);
      window.removeEventListener('scroll', read, true);
    };
  }, [open]);

  return readings;
}

export function Diagnostics() {
  const [open, setOpen] = React.useState(false);
  const readings = useReadings(open);

  return (
    <Card title="Diagnostics">
      <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
        What this build is and what the browser reports about the screen. Useful
        when something is laid out wrongly on a phone and there is no address bar
        to check a version from — the readings update as you scroll, so a
        before-and-after says whether a layout settles late.
      </p>
      <div>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Icon name={open ? 'chevron-down' : 'chevron-right'} size={15} />}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide readings' : 'Show readings'}
        </Button>
      </div>
      {open && (
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px var(--space-5)',
            padding: 'var(--space-5)', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-sunken)',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)',
          }}
        >
          {Object.entries(readings).map(([k, v]) => (
            <React.Fragment key={k}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ color: 'var(--text-strong)' }}>{v}</span>
            </React.Fragment>
          ))}
        </div>
      )}
    </Card>
  );
}
