import * as React from 'react';
import { usePrefersReducedMotion } from 'lingo-ds';
import { STAGE, type Scene } from './sceneKit';
import { castCallScene } from './scenes/castCall';
import { greetingScene } from './scenes/greeting';
import { struggleScene } from './scenes/struggle';

/**
 * The hero's animations, played one after another.
 *
 * A list rather than a single piece, because more are expected. Adding one is
 * writing a scene file and putting it in here: the player asks a scene only for
 * its duration, the window it paints in, and a frame at a time.
 */
const SCENES: Scene[] = [greetingScene, castCallScene, struggleScene];

/**
 * The proportion of the box, fixed across every scene.
 *
 * Each scene is composed as a square and crops to the band it actually uses,
 * and those bands are not the same shape — the greeting is wide and short, the
 * faces nearly square. Letting the box follow each scene's crop would make the
 * hero change height every few seconds and shove the page around underneath it.
 * So the box holds one shape and each scene is fitted inside it.
 */
const BOX = { width: 900, height: 685 };

/** How long a scene takes to fade out and the next to fade in. */
const FADE = 0.45;

export function HeroScenes() {
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

    const tick = (now: number) => {
      if (!started) started = now;
      const elapsed = (now - started) / 1000;
      const scene = SCENES[current];
      if (elapsed >= scene.duration) {
        current = (current + 1) % SCENES.length;
        started = now;
        setIndex(current);
        setT(0);
      } else {
        setT(elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      if (raf || !visible || document.hidden) return;
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
  }, [reducedMotion]);

  const scene = SCENES[index];
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
    ? (bleed ? BOX.width / crop.width : Math.min(BOX.width / crop.width, BOX.height / crop.height)) * unit
    : 0;
  const boxHeight = width * (BOX.height / BOX.width);

  /* Dip to transparent between scenes, so one does not cut into the next. */
  const time = reducedMotion ? scene.still : t;
  const fade = reducedMotion ? 1 : Math.min(
    Math.min(time, FADE) / FADE,
    Math.min(scene.duration - time, FADE) / FADE,
  );

  return (
    <div
      ref={box}
      aria-hidden
      style={{
        width: '100%', aspectRatio: `${BOX.width} / ${BOX.height}`,
        position: 'relative',
        /*
         * A bleeding scene is cut by the card, not by this box — that is the
         * whole point of it, and the box clipping first would leave the figures
         * ending in mid-air a card's padding above the edge. Paint containment
         * clips too, so it comes off with the overflow; layout and style
         * containment stay, which is most of what it was there for.
         */
        overflow: bleed ? 'visible' : 'hidden',
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
