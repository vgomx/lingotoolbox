import { useStore } from '../state/store';
import wordmarkWhite from 'lingo-ds/assets/logo/logo-wordmark-white.svg';
import wordmarkBlack from 'lingo-ds/assets/logo/logo-wordmark-black.svg';

/** Shortest the splash stays up, so a fast open reads as deliberate rather than a flash. */
export const SPLASH_MIN_MS = 600;
/** Matches --dur-base, the system's surface timing. Kept in sync by hand. */
export const SPLASH_EXIT_MS = 180;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export interface SplashProps {
  /** Fading out — still mounted so the exit can play. */
  leaving: boolean;
}

/**
 * The brand moment while IndexedDB opens and seeds.
 *
 * There is no spinner and no progress bar. Progress here would be a lie — the
 * work is a database handshake with no measurable stages — and the system's
 * motion rules rule out anything that merely loops. The mark springs in, holds,
 * and the whole surface fades to reveal the app already rendered beneath it.
 */
export function Splash({ leaving }: SplashProps) {
  const { prefs } = useStore();
  const wordmark = prefs.theme === 'light' ? wordmarkBlack : wordmarkWhite;

  return (
    <div
      aria-hidden={leaving}
      role="status"
      aria-label="Opening Lingo Toolbox"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'grid', placeItems: 'center',
        background: 'var(--surface-app)',
        opacity: leaving ? 0 : 1,
        pointerEvents: leaving ? 'none' : 'auto',
        transition: 'opacity var(--dur-base) var(--ease-standard)',
      }}
    >
      <style>
        {'@keyframes lt-splash-in{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}'}
      </style>
      <img
        src={wordmark}
        alt="Lingo Toolbox"
        style={{
          height: 64, width: 'auto',
          animation: 'lt-splash-in var(--dur-slow) var(--ease-spring) both',
        }}
      />
    </div>
  );
}
