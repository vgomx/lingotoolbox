import * as React from 'react';

/**
 * Whether this is running as an installed app, and whether it could be.
 *
 * Two different questions with two different answers per browser, so they are
 * kept apart:
 *
 *  - `installed` is a fact the browser tells us, and where it is true there is
 *    nothing to offer.
 *  - `promptInstall` exists only on Chromium, which fires `beforeinstallprompt`
 *    and lets the page raise the real install dialog. Where that exists it is
 *    strictly better than telling someone which menus to open, so the entry
 *    point becomes a button rather than a set of instructions.
 *  - `steps` is the fallback for browsers with no such API — Safari above all,
 *    where installing is a real feature reachable only by hand.
 */

export type InstallRoute =
  /** Chromium: the browser will show its own install dialog on request. */
  | 'prompt'
  /** iOS/iPadOS: Share → Add to Home Screen. Every browser there is WebKit. */
  | 'ios'
  /** Safari on macOS 14+: Share → Add to Dock. */
  | 'macos-safari'
  /** No path worth describing — offer nothing rather than a dead end. */
  | 'none';

interface PromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/*
 * beforeinstallprompt fires once, early — often before React has mounted — and
 * is gone if nobody caught it. So it is captured at module scope and the hooks
 * subscribe to what was caught, rather than each hook adding its own listener
 * and finding the event already past.
 */
let deferred: PromptEvent | null = null;
let installedAt = false;
const listeners = new Set<() => void>();
const announce = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    announce();
  });
  // Fires whether the install came from our button or the browser's own UI, so
  // the entry point disappears without needing a reload.
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedAt = true;
    announce();
  });
}

/** Running from a home-screen or dock icon rather than a browser tab. */
function isInstalled(): boolean {
  if (installedAt) return true;
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches;
  // iOS did not match display-mode until 16.4; navigator.standalone is how it
  // answered before that, and still does.
  return standalone || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

/**
 * Which set of instructions applies, when there is no install API.
 *
 * User-agent sniffing, which is a guess — but the alternative is showing every
 * reader every browser's instructions. It is only ever used to pick *copy*:
 * nothing about the app behaves differently, and a wrong guess costs a reader
 * one wrong paragraph rather than a broken screen.
 */
function routeWithoutPrompt(): InstallRoute {
  if (typeof navigator === 'undefined') return 'none';
  const ua = navigator.userAgent;
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  if (/iPhone|iPad|iPod/.test(ua) || touchMac) return 'ios';
  // Safari proper: no Chrome/Chromium/Firefox token.
  if (/Safari/.test(ua) && !/Chrom|CriOS|FxiOS|Firefox|Edg|OPR/.test(ua)) return 'macos-safari';
  return 'none';
}

export interface InstallState {
  installed: boolean;
  route: InstallRoute;
  /** Raises the browser's own install dialog. Only set when route is 'prompt'. */
  promptInstall: (() => Promise<'accepted' | 'dismissed'>) | null;
}

export function useInstallState(): InstallState {
  const [, bump] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    listeners.add(bump);
    // display-mode flips the moment an installed copy is opened, and on iOS a
    // reader can be looking at the tab and the installed app in turn.
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', bump);
    return () => { listeners.delete(bump); mq.removeEventListener('change', bump); };
  }, []);

  const installed = isInstalled();
  const route: InstallRoute = installed ? 'none' : deferred ? 'prompt' : routeWithoutPrompt();

  const promptInstall = React.useCallback(async () => {
    if (!deferred) return 'dismissed' as const;
    const event = deferred;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt can only be raised once; Chromium fires a fresh event if the
    // reader dismisses it and the page later qualifies again.
    deferred = null;
    announce();
    return outcome;
  }, []);

  return { installed, route, promptInstall: route === 'prompt' ? promptInstall : null };
}
