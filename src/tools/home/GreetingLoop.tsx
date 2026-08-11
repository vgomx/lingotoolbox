import * as React from 'react';
import { usePrefersReducedMotion } from 'lingo-ds';
import { flagUrl } from '../../data/illustrations';

/*
 * Two faces saying hello, ported from the "Emoji Dialog Loop" design piece.
 *
 * The original runs inside an authoring runtime — scenes, cues, a tweaks
 * panel, a 1080×1080 export stage. None of that belongs in the product, so
 * what came across is the choreography: the same geometry and the same easing
 * curves, driven by a plain clock.
 *
 * Everything is authored against a 1080-wide stage and scaled to fit, because
 * the numbers in here are the design's own. Rewriting them for a 420px box
 * would have meant re-deriving every position by hand, and the first thing to
 * drift would have been the relationship between the faces and their bubbles.
 */

/** Authored stage width. Every coordinate below is in these units. */
const STAGE = 1080;

/*
 * Where the piece actually paints, measured rather than estimated: the two
 * faces and their bubbles span x 107–996 and y 203–870 of the 1080 square,
 * once the camera's 1.15 zoom and drift are accounted for.
 *
 * Cropped to that band rather than scaled down to fit, because the hero has
 * width to spare and very little height — a full 1080² at this width would
 * put the greeting at 8px.
 */
const CROP = { left: 100, top: 195, width: 900, height: 685 };

/*
 * How small the scene may get before it stops shrinking and starts clipping.
 *
 * Below this the greeting is no longer a word, it is texture — 48px of stage
 * type at 0.20 is under 10px. So a narrow container does not squeeze the
 * scene into it; the scene holds this size and the container shows what fits,
 * anchored to its top right. What fits is the reply bubble and the face
 * answering, which is the half that carries the language cycle.
 */
const MIN_SCALE = 0.2;

/** Scene starts, in seconds. Named as the design names them. */
const CUE = { greet: 0, reply: 1.3, scripts: 2.6, settle: 5.0 };
const TOTAL = 6.0;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The four curves the piece uses, copied rather than approximated. */
const ease = {
  outQuad: (t: number) => t * (2 - t),
  outCubic: (t: number) => --t * t * t + 1,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  outBack: (t: number) => {
    const c1 = 1.70158;
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

/** `from` before `start`, `to` after `end`, eased between — as the runtime does. */
const tween = (from: number, to: number, start: number, end: number, e = ease.outCubic) =>
  (t: number) => {
    if (t <= start) return from;
    if (t >= end) return to;
    return from + (to - from) * e((t - start) / (end - start));
  };

const pop = (start: number, dur = 0.42) => tween(0, 1, start, start + dur, ease.outBack);
const cycle = (t: number, period: number, amp: number, phase = 0) =>
  Math.sin((t / period + phase) * Math.PI * 2) * amp;

/* ── the greetings ───────────────────────────────────────────────────────── */

interface Line { hex: string; lang: string; text: string; size: number }

const LINES: Line[] = [
  { hex: '1F1EA-1F1F8', lang: 'Spanish', text: '¡Hola!', size: 48 },
  { hex: '1F1F5-1F1F9', lang: 'Portuguese', text: 'Olá!', size: 48 },
  { hex: '1F1EF-1F1F5', lang: 'Japanese', text: 'こんにちは', size: 40 },
  { hex: '1F1F0-1F1F7', lang: 'Korean', text: '안녕하세요', size: 40 },
  { hex: '1F1EC-1F1F7', lang: 'Greek', text: 'Γειά σου', size: 44 },
  { hex: '1F1F3-1F1F1', lang: 'Dutch', text: 'Hallo', size: 48 },
  { hex: '1F1EB-1F1F7', lang: 'French', text: 'Salut', size: 48 },
];

/* ── the face rig ────────────────────────────────────────────────────────── */

/* OpenMoji's own palette, not the theme's: this is that emoji, and a yellow
   disc with black line art is what it is on any background. */
const YELLOW = '#FCEA2B';
const LINE = '#000000';
const MOUTH_IN = '#EA5A47';

interface Mouth { w: number; open: number; curve: number }
const REST_MOUTH: Mouth = { w: 9.4, open: 0, curve: 3.4 };

const mouthPath = ({ w, open, curve }: Mouth) => {
  const cx = 36, cy = 44.2;
  const l = cx - w, r = cx + w;
  const top = cy - curve * 0.55;
  return `M${l},${top} Q${cx},${cy + curve} ${r},${top} Q${cx},${cy + curve + open * 2} ${l},${top} Z`;
};

/** Three detuned sines, so the mouth never lands on an obvious rhythm. */
function speakMouth(p: number): Mouth {
  const a = 0.5 + 0.5 * Math.sin(p * Math.PI * 2 * 3.15);
  const b = 0.5 + 0.5 * Math.sin(p * Math.PI * 2 * 1.85 + 1.3);
  const c = 0.5 + 0.5 * Math.sin(p * Math.PI * 2 * 5.4 + 0.4);
  return {
    w: 10.6 - 3.4 * (1 - b) - 0.8 * c,
    open: 1.0 + 5.9 * a * (0.42 + 0.58 * b),
    curve: 1.9 + 1.5 * b,
  };
}

/** Eye opening, dipping to a slit at each blink time. */
function blink(t: number, times: number[]) {
  let v = 1;
  for (const t0 of times) {
    const d = t - t0;
    if (d >= 0 && d < 0.15) v = Math.min(v, Math.abs(d - 0.075) / 0.075);
  }
  return 0.06 + 0.94 * v;
}

interface FaceState {
  mouth: Mouth; eyeOpen: number; lookX: number; lookY: number;
  brow: number; tilt: number; squashX: number; squashY: number;
}

function Face({ state, size, x, y }: { state: FaceState; size: number; x: number; y: number }) {
  const { mouth, eyeOpen, lookX, lookY, brow, tilt, squashX, squashY } = state;
  const brows = (bx: number) =>
    `M${bx - 4.4},${25.4 - brow * 0.9} Q${bx},${22.2 - brow * 2.4} ${bx + 4.4},${25.4 - brow * 0.9}`;
  const stroke = { fill: 'none', stroke: LINE, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: size, height: size,
        transform: `rotate(${tilt}deg) scale(${squashX},${squashY})`,
        transformOrigin: '50% 88%',
      }}
    >
      <svg viewBox="0 0 72 72" width={size} height={size} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
        <circle cx={36} cy={36} r={23} fill={YELLOW} />
        <circle cx={36} cy={36} r={23} {...stroke} />
        <path d={brows(27)} {...stroke} opacity={clamp(brow * 0.9, 0, 1)} />
        <path d={brows(45)} {...stroke} opacity={clamp(brow * 0.9, 0, 1)} />
        <ellipse cx={27 + lookX} cy={31 + lookY} rx={3} ry={3 * eyeOpen} fill={LINE} />
        <ellipse cx={45 + lookX} cy={31 + lookY} rx={3} ry={3 * eyeOpen} fill={LINE} />
        <path d={mouthPath(mouth)} {...stroke} fill={mouth.open > 0.6 ? MOUTH_IN : 'none'} />
      </svg>
    </div>
  );
}

/* ── bubbles ─────────────────────────────────────────────────────────────── */

function Bubble({ side, bg, fg, border, scale, opacity, lift, width, children }: {
  side: 'left' | 'right'; bg: string; fg: string; border: string | null;
  scale: number; opacity: number; lift: number; width: number; children: React.ReactNode;
}) {
  if (opacity <= 0.001 || scale <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute', ...(side === 'left' ? { left: 322 } : { right: 322 }),
        top: side === 'left' ? 256 : 284,
        transform: `translateY(${lift}px) scale(${scale})`,
        transformOrigin: side === 'left' ? '14% 108%' : '86% 108%',
        opacity, willChange: 'transform',
      }}
    >
      <div
        style={{
          position: 'relative', background: bg, color: fg,
          border: border ? `1px solid ${border}` : 'none',
          borderRadius: 18, padding: '14px 22px 16px',
          minWidth: 160, maxWidth: width,
          display: 'flex', flexDirection: 'column', gap: 4,
          alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        }}
      >
        {children}
        <div
          style={{
            position: 'absolute', bottom: -9, ...(side === 'left' ? { left: 32 } : { right: 32 }),
            width: 22, height: 22, background: bg, borderRadius: 5, transform: 'rotate(45deg)',
            borderRight: border && side === 'right' ? `1px solid ${border}` : 'none',
            borderBottom: border ? `1px solid ${border}` : 'none',
            borderLeft: border && side === 'left' ? `1px solid ${border}` : 'none',
          }}
        />
      </div>
    </div>
  );
}

function Greeting({ line, fg, chipFg }: { line: Line; fg: string; chipFg: string }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 22 }}>
        <img
          src={flagUrl(line.hex)}
          alt=""
          width={38}
          height={38}
          style={{ display: 'block', width: 38, height: 38, margin: '-8px -3px' }}
        />
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15, letterSpacing: '0.02em', color: chipFg }}>
          {line.lang}
        </span>
      </div>
      {/*
        * The app's own faces do not carry Japanese, Korean or Greek — they are
        * subset to latin and latin-ext. The system font takes those, which is
        * why the stack ends where it does rather than pulling a CJK webfont
        * over the network for four characters of decoration.
        */}
      <div
        style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: line.size,
          lineHeight: 1.15, letterSpacing: '-0.01em', color: fg, whiteSpace: 'nowrap',
        }}
      >
        {line.text}
      </div>
    </>
  );
}

/* ── one frame ───────────────────────────────────────────────────────────── */

function Frame({ t }: { t: number }) {
  const { greet: A, reply: B, scripts: C, settle: D } = CUE;

  const leftSpeak: [number, number] = [A + 0.32, A + 1.06];
  const rightSpeak: [number, number] = [B + 0.2, B + 0.96];
  const rightCycle: [number, number] = [C + 0.05, D - 0.12];

  const speaking = (w: [number, number]) => t >= w[0] && t <= w[1];
  const mouthFor = (wins: [number, number][]): Mouth => {
    for (const w of wins) {
      if (t >= w[0] - 0.14 && t <= w[1] + 0.18) {
        const ramp = clamp(Math.min(t - (w[0] - 0.14), w[1] + 0.18 - t) / 0.16, 0, 1);
        const m = speakMouth(t - w[0]);
        return {
          w: REST_MOUTH.w + (m.w - REST_MOUTH.w) * ramp,
          open: m.open * ramp,
          curve: REST_MOUTH.curve + (m.curve - REST_MOUTH.curve) * ramp,
        };
      }
    }
    return REST_MOUTH;
  };

  const leftTalking = speaking(leftSpeak);
  const rightTalking = speaking(rightSpeak) || speaking(rightCycle);

  const lAnticipate = tween(0, 1, A + 0.06, A + 0.24, ease.outQuad)(t)
    - tween(0, 1, A + 0.24, A + 0.5, ease.outBack)(t);
  const lBob = leftTalking ? cycle(t - leftSpeak[0], 0.33, 2.1) : 0;
  const lNod = t > C && t < D ? cycle(t - C, 1.15, 3.0) : 0;
  const left: FaceState = {
    mouth: mouthFor([leftSpeak]),
    eyeOpen: blink(t, [A + 0.78, C + 0.3, C + 1.85]) * (t > B && t < D ? 1.12 : 1),
    lookX: tween(0, 1.4, B - 0.25, B + 0.15)(t) - tween(0, 1.4, D + 0.2, D + 0.6)(t),
    lookY: 0.2,
    brow: tween(0, 1, B - 0.2, B + 0.2)(t) - tween(0, 1, D + 0.15, D + 0.55)(t),
    tilt: lBob + lNod * 0.7 + lAnticipate * -3,
    squashX: 1 + lAnticipate * 0.07 + (leftTalking ? cycle(t - leftSpeak[0], 0.33, 0.015) : 0),
    squashY: 1 - lAnticipate * 0.06 - (leftTalking ? cycle(t - leftSpeak[0], 0.33, 0.015) : 0),
  };

  const rAnticipate = tween(0, 1, B - 0.08, B + 0.1, ease.outQuad)(t)
    - tween(0, 1, B + 0.1, B + 0.36, ease.outBack)(t);
  const rBob = rightTalking
    ? cycle(t - (speaking(rightSpeak) ? rightSpeak[0] : rightCycle[0]), 0.31, 2.3)
    : 0;
  const right: FaceState = {
    mouth: mouthFor([rightSpeak, rightCycle]),
    eyeOpen: blink(t, [B - 0.42, C + 1.05, C + 2.05]) * (t > A + 0.3 && t < B ? 1.15 : 1),
    lookX: -1.2 + tween(0, 1.2, B - 0.1, B + 0.3)(t) - tween(0, 1.2, D + 0.25, D + 0.7)(t),
    lookY: 0.2,
    brow: tween(0, 1, A + 0.45, A + 0.8)(t) - tween(0, 0.75, B - 0.1, B + 0.3)(t)
      - tween(0, 0.25, D + 0.25, D + 0.7)(t),
    tilt: rBob - rAnticipate * 3,
    squashX: 1 + rAnticipate * 0.07 + (rightTalking ? cycle(t - rightSpeak[0], 0.31, 0.015) : 0),
    squashY: 1 - rAnticipate * 0.06 - (rightTalking ? cycle(t - rightSpeak[0], 0.31, 0.015) : 0),
  };

  const lPop = pop(A + 0.24)(t);
  const lCollapse = tween(0, 1, C - 0.22, C + 0.06, ease.inOutCubic)(t);
  const lFadeOut = tween(0, 1, D + 0.18, D + 0.62, ease.inOutCubic)(t);
  const lDim = tween(0, 0.42, B + 0.02, B + 0.36)(t);
  const dotsIn = pop(C - 0.05, 0.34)(t) * (1 - lFadeOut);

  const rPop = pop(B + 0.12)(t);
  const rOut = tween(0, 1, D + 0.05, D + 0.5, ease.inOutCubic)(t);

  /* Which greeting the reply is showing: five steps across the Scripts scene. */
  const cycleStart = C + 0.02;
  const step = (D - 0.05 - cycleStart) / 5;
  let rLine = LINES[1];
  let swap = 1;
  if (t >= cycleStart) {
    const i = clamp(Math.floor((t - cycleStart) / step), 0, 4);
    rLine = LINES[2 + i];
    swap = clamp((t - cycleStart - i * step) / 0.16, 0, 1);
  }
  const swapScale = 0.84 + 0.16 * ease.outBack(swap);

  /* A slow breath over exactly one period, so the loop seam is invisible. */
  const camScale = (1 + 0.014 + cycle(t, TOTAL, 0.014, -0.25)) * 1.15;
  const camX = cycle(t, TOTAL, 10, 0);
  const camY = cycle(t, TOTAL, 7, 0.35);

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        transform: `translate(${camX}px, ${camY}px) scale(${camScale})`,
        transformOrigin: '50% 50%',
      }}
    >
      <Bubble
        side="left"
        bg="var(--surface-card)"
        fg="var(--text-strong)"
        border="var(--border)"
        scale={clamp(lPop, 0, 1) * (1 - 0.08 * lDim)}
        opacity={clamp(lPop * 1.4, 0, 1) * (1 - 0.45 * lDim) * (1 - lCollapse)}
        lift={(1 - clamp(lPop, 0, 1)) * 16}
        width={320}
      >
        <Greeting line={LINES[0]} fg="var(--text-strong)" chipFg="var(--text-muted)" />
      </Bubble>

      {dotsIn > 0.01 && (
        <div
          style={{
            position: 'absolute', left: 322, top: 304,
            transform: `scale(${clamp(dotsIn, 0, 1)})`, transformOrigin: '14% 120%',
            opacity: clamp(dotsIn * 1.5, 0, 1),
            background: 'var(--surface-card)', border: '1px solid var(--border)',
            borderRadius: 999, padding: '13px 18px', display: 'flex', gap: 8,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 11, height: 11, borderRadius: 999, background: 'var(--text-muted)',
                opacity: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t - C) * Math.PI * 2 * 1.6 - i * 0.9)),
                transform: `translateY(${cycle(t - C, 0.62, 4, -i * 0.18)}px)`,
              }}
            />
          ))}
        </div>
      )}

      {/* The reply keeps white on brand in both themes: --brand is the same
          violet either way, so the text on it does not get a vote. */}
      <Bubble
        side="right"
        bg="var(--brand)"
        fg="#FFFFFF"
        border={null}
        scale={clamp(rPop, 0, 1) * (1 - 0.22 * rOut)}
        opacity={clamp(rPop * 1.4, 0, 1) * (1 - rOut)}
        lift={(1 - clamp(rPop, 0, 1)) * 16}
        width={360}
      >
        <div style={{ transform: `scale(${swapScale})`, transformOrigin: '100% 50%', opacity: 0.35 + 0.65 * swap }}>
          <Greeting line={rLine} fg="#FFFFFF" chipFg="rgba(255,255,255,.78)" />
        </div>
      </Bubble>

      <Face state={left} size={380} x={175} y={414} />
      <Face state={right} size={380} x={525} y={436} />
    </div>
  );
}

/* ── the clock ───────────────────────────────────────────────────────────── */

/**
 * The greeting loop, sized to whatever box it is given.
 *
 * Stops when it cannot be seen. A six-second loop repainting two SVG faces
 * forever is not free, and the home screen is the one people leave open — so
 * the frame only advances while the element is on screen and the tab is
 * focused. Reduced motion holds a single frame instead, chosen at the moment
 * both bubbles are up.
 */
export function GreetingLoop() {
  const reducedMotion = usePrefersReducedMotion();
  const box = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [t, setT] = React.useState(reducedMotion ? 1.95 : 0);

  // Scale from the measured width, so the authored coordinates never change.
  React.useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (reducedMotion) { setT(1.95); return undefined; }
    const el = box.current;
    if (!el) return undefined;

    let raf = 0;
    let started = 0;
    let visible = false;

    const tick = (now: number) => {
      if (!started) started = now;
      setT(((now - started) / 1000) % TOTAL);
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      if (raf || !visible || document.hidden) return;
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

  /*
   * Fit the crop to the width, but never below the size at which the greeting
   * stops being readable. Past that the scene keeps its size and the box shows
   * the right-hand part of it.
   */
  const scale = width ? Math.max(width / CROP.width, MIN_SCALE) : 0;
  /* Wider than the box: the left of the scene is being cut off. */
  const clipped = scale > 0 && CROP.width * scale > width + 1;

  return (
    <div
      ref={box}
      aria-hidden
      style={{
        width: '100%',
        /*
         * Fade the cut edge rather than guillotine it. A hard clip lands
         * wherever it lands — through the middle of a face, or across half a
         * word — and reads as a rendering fault. Fading says the scene
         * continues past the edge, which is what is actually happening.
         */
        maskImage: clipped ? `linear-gradient(to right, transparent 0, #000 ${Math.round(Math.max(28, width * 0.3))}px)` : undefined,
        WebkitMaskImage: clipped ? `linear-gradient(to right, transparent 0, #000 ${Math.round(Math.max(28, width * 0.3))}px)` : undefined,
        // The crop's own proportion at the scale actually in use, so the band
        // is never cut short by a box sized for a different one.
        height: scale ? Math.round(CROP.height * scale) : undefined,
        aspectRatio: scale ? undefined : `${CROP.width} / ${CROP.height}`,
        overflow: 'hidden', position: 'relative', contain: 'strict',
      }}
    >
      {scale > 0 && (
        <div
          style={{
            position: 'absolute',
            /*
             * Anchored to the top right: the crop's right edge meets the box's
             * right edge, and anything too wide to fit falls off the left. On
             * a phone that leaves the reply and the face saying it — the half
             * worth keeping — instead of two faces too small to read.
             */
            top: -CROP.top * scale,
            left: width - (CROP.left + CROP.width) * scale,
            width: STAGE, height: STAGE,
            transform: `scale(${scale})`, transformOrigin: '0 0',
          }}
        >
          <Frame t={t} />
        </div>
      )}
    </div>
  );
}

