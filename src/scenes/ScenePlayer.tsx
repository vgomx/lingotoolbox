import * as React from 'react';
import { usePrefersReducedMotion } from 'lingo-ds';
import { STAGE, type Scene } from './sceneKit';

/**
 * Plays a list of scenes, one after another, forever.
 *
 * The list comes from the caller rather than living here, because the same
 * player now runs in two places that want different pieces: the dashboard hero
 * shows the cast call, and the landing page closes with the two face loops. A
 * scene is asked only for its duration, the window it paints in, and a frame at
 * a time, so neither caller needs to know anything else about it.
 */

/**
 * The proportion of the box, fixed across every scene.
 *
 * Each scene is composed as a square and crops to the band it actually uses,
 * and those bands are not the same shape — the greeting is wide and short, the
 * faces nearly square. Letting the box follow each scene's crop would make the
 * surface change height every few seconds and shove the page around underneath
 * it. So the box holds one shape and each scene is fitted inside it.
 *
 * One shape for both surfaces rather than one each: it was chosen to hold the
 * greeting and the faces without either jumping, which is exactly what the
 * landing page now asks of it.
 *
 * A caller may override the height, and only the height — see `band`.
 */
const BOX = { width: 900, height: 685 };

/** How long a scene takes to fade out and the next to fade in. */
const FADE = 0.45;

/**
 * Shortening the box does not shrink a bleeding scene.
 *
 * The scale is the container over the crop's width and the height never enters
 * into it, so a shorter box shows the same figures at the same size and simply
 * cuts them higher. That was tried on the stacked cast call and rejected: it is
 * bottom-anchored and its members are not the same height, so the cut landed
 * somewhere different on each — 540 crossed the Punjabi man's mouth to save
 * 14px of a 369px card.
 *
 * It earns its place with an arrangement composed for it. The side-by-side cast
 * is two columns in a band a third as tall, and a box at the shared 685 would
 * pad it with empty stage rather than show more of anything.
 */

export function ScenePlayer({ scenes, band = BOX.height, once = false }: {
  scenes: Scene[];
  band?: number;
  /**
   * Run the list through once and hold the last frame, instead of looping.
   *
   * For a scene that is about something that just happened. The hero loops
   * because it is wallpaper with a cast in it; a celebration that comes round
   * again every seven seconds is not a celebration, it is a screensaver — and
   * the pieces written this way already end where they should be left, on a
   * shut mouth and a settled pose.
   */
  once?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const box = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [index, setIndex] = React.useState(0);
  const [t, setT] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (reducedMotion) return undefined;
    const el = box.current;
    if (!el) return undefined;

    let raf = 0;
    let started = 0;
    let visible = false;
    /* Kept in a ref rather than read from state: the callback is created once
       and would otherwise close over the first scene forever. */
    let current = 0;
    /* Declared before `tick`, which closes over it. */
    let finished = false;

    const tick = (now: number) => {
      if (!started) started = now;
      const elapsed = (now - started) / 1000;
      const scene = scenes[current];
      if (elapsed >= scene.duration) {
        const last = current === scenes.length - 1;
        if (once && last) {
          // Held, not stopped mid-air: the final frame is the pose the piece
          // was composed to end on. Latched, so glancing away and back does not
          // replay a celebration for something that happened minutes ago.
          finished = true;
          setT(scene.duration);
          raf = 0;
          return;
        }
        current = (current + 1) % scenes.length;
        started = now;
        setIndex(current);
        setT(0);
      } else {
        setT(elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      if (raf || finished || !visible || document.hidden) return;
      // Resume where the scene was rather than restarting it, so glancing away
      // does not send the reader back to the first beat every time.
      started = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) run(); else stop(); });
    io.observe(el);
    const onVisibility = () => (document.hidden ? stop() : run());
    document.addEventListener('visibilitychange', onVisibility);

    return () => { stop(); io.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [reducedMotion, scenes, once]);

  const scene = scenes[index];
  const { crop } = scene;

  /*
   * Fit the crop inside the box, never cropping it further: whichever of the
   * two axes runs out first decides the scale, and the rest is empty space.
   *
   * Unless the scene asks to bleed, in which case the width decides alone and
   * whatever that makes too tall runs off the bottom — see Scene.bleed.
   */
  const unit = width ? width / BOX.width : 0;
  const bleed = scene.bleed === 'bottom';
  const fit = unit
    ? (bleed ? BOX.width / crop.width : Math.min(BOX.width / crop.width, band / crop.height)) * unit
    : 0;
  const boxHeight = width * (band / BOX.width);

  /*
   * Dip to transparent between scenes, so one does not cut into the next.
   *
   * The dip out is a handover to whatever comes next, so a one-shot on its last
   * scene does not do it: the frame it is left holding is the end of the piece,
   * and fading it to nothing would leave an empty box where the pose should be.
   */
  const time = reducedMotion ? scene.still : t;
  const holds = once && index === scenes.length - 1;
  const fade = reducedMotion ? 1 : Math.min(
    Math.min(time, FADE) / FADE,
    holds ? 1 : Math.min(scene.duration - time, FADE) / FADE,
  );

  return (
    <div
      ref={box}
      aria-hidden
      style={{
        width: '100%', aspectRatio: `${BOX.width} / ${band}`,
        position: 'relative',
        /*
         * A bleeding scene is cut by the card, not by this box — that is the
         * whole point of it, and the box clipping first would leave the figures
         * ending in mid-air a card's padding above the edge. Paint containment
         * clips too, so it comes off with the overflow; layout and style
         * containment stay, which is most of what it was there for.
         *
         * Downward only, though. Taking the clip off entirely let the cast out
         * on every side: measured across a pass, characters painted 42px past
         * the left edge, 38px past the right and 83px above the top, at full
         * opacity — the sideways travel of a creep and the slide each of them
         * arrives and leaves on, which the box had been quietly absorbing all
         * along. The inset clip puts those three sides back and opens the
         * bottom by more than any figure can reach.
         */
        overflow: bleed ? 'visible' : 'hidden',
        clipPath: bleed ? 'inset(0 0 -100% 0)' : undefined,
        contain: bleed ? 'layout style' : 'strict',
      }}
    >
      {fit > 0 && (
        <div
          style={{
            position: 'absolute',
            // The crop's centre on the box's centre, at the scale that fits —
            // or its top edge on the box's top, when the bottom is going over.
            left: (width - crop.width * fit) / 2 - crop.left * fit,
            top: bleed
              ? -crop.top * fit
              : (boxHeight - crop.height * fit) / 2 - crop.top * fit,
            width: STAGE, height: STAGE,
            transform: `scale(${fit})`, transformOrigin: '0 0',
            opacity: Math.max(0, fade),
          }}
        >
          <scene.Frame t={time} />
        </div>
      )}
    </div>
  );
}
