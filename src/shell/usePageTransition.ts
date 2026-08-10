import * as React from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { usePrefersReducedMotion } from 'lingo-ds';

/**
 * Which way a navigation went, which is what decides how the next screen enters.
 *
 * `hub` is arriving somewhere new — Flashcards to Roots. `forward` and `back`
 * are moves inside a place you are already in, a deck to one of its cards and
 * out again. They get different motions because they mean different things: a
 * screen that rises says you arrived, and a screen that rises on the way into a
 * deck's own card says you left and came back when you did not.
 */
type Direction = 'none' | 'hub' | 'forward' | 'back';

const depth = (path: string) => path.split('/').filter(Boolean).length;

/**
 * The hub a path belongs to, coarser than the route.
 *
 * /app/review folds into /app/cards, so starting a session counts as staying
 * inside Flashcards rather than arriving somewhere new.
 */
const hubOf = (path: string) => {
  const folded = path.replace('/app/review', '/app/cards');
  return folded.split('/').slice(0, 3).join('/');
};

export function usePageTransition() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const reducedMotion = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  /*
   * Adjusting state during render rather than in an effect — React's own
   * pattern for "something derived from a prop that changed". An effect would
   * run after paint, so the first frame of the new screen would be its settled
   * position and the animation would start by jumping backwards.
   *
   * Idempotent: a second render with the same pathname takes neither branch,
   * so StrictMode's double invoke cannot double-count a navigation.
   */
  const [seen, setSeen] = React.useState(pathname);
  const [direction, setDirection] = React.useState<Direction>('none');
  if (seen !== pathname) {
    const deeper = depth(pathname) - depth(seen);
    setDirection(
      hubOf(seen) !== hubOf(pathname) ? 'hub'
        : deeper > 0 ? 'forward'
        : deeper < 0 ? 'back'
        // Same depth inside one hub — one word to a related word. The history
        // action is the only thing that knows which way that went.
        : navigationType === 'POP' ? 'back' : 'forward',
    );
    setSeen(pathname);
  }

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion || direction === 'none') return undefined;

    // Read from the token so this cannot drift from the rest of the app's
    // motion, and so the reduced-motion media query — which zeroes the
    // durations at the token level — is honoured even without the hook.
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-slow')) || 280;
    if (!ms) return undefined;

    const from = direction === 'hub' ? 'translateY(10px)'
      : direction === 'back' ? 'translateX(-22px)'
      : 'translateX(22px)';

    /*
     * Animated rather than keyed-and-remounted, which is how this worked when
     * only hubs animated. Keying the pane on the path would remount the routed
     * component on every navigation, and going from one word to another would
     * throw away a screen whose data is already loaded to show a spinner.
     *
     * `backwards` fill so the first painted frame is the start of the
     * animation rather than the settled position. No forwards fill: once it
     * finishes the element must hold no transform at all, because a
     * transformed ancestor becomes the containing block for fixed-position
     * descendants.
     */
    const animation = el.animate(
      [{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }],
      { duration: ms, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' },
    );
    return () => animation.cancel();
  }, [pathname, direction, reducedMotion]);

  return ref;
}
