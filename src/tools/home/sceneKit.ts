import type * as React from 'react';

/**
 * What the hero's scenes are built from.
 *
 * The pieces come from Claude Design compositions, which run inside an
 * authoring runtime — scenes, cues, a tweaks panel, a 1080×1080 export stage.
 * None of that ships. What crosses over is the choreography, and it needs three
 * things from the runtime it left behind: a 1080-wide coordinate space, four
 * easing curves, and a clock. This is those.
 *
 * Every coordinate in a scene is authored against the 1080 stage. Rewriting
 * them to fit a hero would mean re-deriving every position by hand, and the
 * first thing to drift would be how the parts relate to each other.
 */
export const STAGE = 1080;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The curves the compositions use, copied from the runtime rather than approximated. */
export const ease = {
  outQuad: (t: number) => t * (2 - t),
  outCubic: (t: number) => --t * t * t + 1,
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  outBack: (t: number) => {
    const c1 = 1.70158;
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

/** `from` before `start`, `to` after `end`, eased between — as the runtime does. */
export const tween = (from: number, to: number, start: number, end: number, e = ease.outCubic) =>
  (t: number) => {
    if (t <= start) return from;
    if (t >= end) return to;
    return from + (to - from) * e((t - start) / (end - start));
  };

export const pop = (start: number, dur = 0.42) => tween(0, 1, start, start + dur, ease.outBack);

export const cycle = (t: number, period: number, amp: number, phase = 0) =>
  Math.sin((t / period + phase) * Math.PI * 2) * amp;

/* ── the shared face ─────────────────────────────────────────────────────── */

/*
 * OpenMoji's own palette, not the theme's. Both compositions are built in the
 * same construction grammar — a 23-radius yellow disc under a 2px black
 * round-cap line layer — and that is what those emoji are, on any background.
 */
export const YELLOW = '#FCEA2B';
export const LINE = '#000000';
export const MOUTH_IN = '#EA5A47';
export const BLUE = '#92D3F5';
export const AMBER = '#F4AA41';

/** The line layer's stroke, at whatever weight a part of the face wants. */
export const stroke = (w = 2) => ({
  fill: 'none' as const,
  stroke: LINE,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/* ── what a scene is ─────────────────────────────────────────────────────── */

/**
 * The window onto the 1080 square that a scene actually paints in.
 *
 * Measured per scene rather than assumed: the pieces are composed as squares
 * and the hero is a wide, short box, so a scene scaled to fit the square would
 * put its type at a few pixels. Each scene is cropped to the band it uses.
 */
export interface Crop { left: number; top: number; width: number; height: number }

export interface Scene {
  id: string;
  /** Seconds. The loop runs a scene once, then moves to the next. */
  duration: number;
  crop: Crop;
  /** The moment held when the reader prefers reduced motion. */
  still: number;
  /**
   * Let the scene run off the bottom of the box and be cut by the card.
   *
   * The default is to fit the whole crop inside the box, which is right for a
   * scene that is a picture of something. The cast call is not: it is people
   * standing in front of you, and a person whose feet are on screen reads as a
   * doll on a shelf. Fitted to the width instead and anchored at the top, the
   * figures come up about a fifth larger and the card's own edge takes their
   * legs — so they read as standing behind it rather than inside it.
   *
   * The crop still describes the whole band the scene paints. This is a
   * decision about how to show it, not a claim about what is there.
   */
  bleed?: 'bottom';
  Frame: (props: { t: number }) => React.ReactElement;
}
