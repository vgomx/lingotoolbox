import { Button, Toast } from 'lingo-ds';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** How often an open app asks whether a newer build has been deployed. */
const POLL_MS = 60 * 60 * 1000;

/**
 * Tells you when a new build is waiting, and swaps to it when you say so.
 *
 * The service worker answers from its cache before the network is consulted,
 * which is what makes the app work on a plane and also what made a deploy take
 * two visits to appear: the worker fetched the new build in the background and
 * then kept serving the old one until the next launch. On an installed app that
 * launch may never come, because the window is never really closed.
 *
 * It asks rather than reloading by itself. A reload throws away the review queue,
 * which lives in memory — being sent back to the deck list mid-session because a
 * deploy landed is a worse bug than the one this fixes. The toast sits still and
 * waits; the session is safe until you press the button.
 *
 * Polling matters as much as the prompt. Without it an installed app that stays
 * open for days never asks the question at all.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => { void registration.update(); }, POLL_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 60 }}>
      <Toast
        tone="brand"
        title="A new version is ready"
        description="Reload to pick it up. Anything you have saved stays where it is."
        onClose={() => setNeedRefresh(false)}
        action={(
          <Button size="sm" onClick={() => void updateServiceWorker(true)}>
            Reload
          </Button>
        )}
      />
    </div>
  );
}
