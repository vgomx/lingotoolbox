import * as React from 'react';
import { flagUrl } from '../../../data/illustrations';
import {
  AMBER, BLUE, LINE, MOUTH_IN, YELLOW, clamp, cycle, ease, pop, stroke, tween,
  type Scene,
} from '../sceneKit';

/*
 * Eight faces failing to understand things, and then one of them getting it.
 * Ported from the "Struggle Faces Loop" design piece.
 *
 * The other scene is two faces talking; this one is one face at a time, wearing
 * a different expression per beat. They share the construction grammar — the
 * yellow disc and the black line layer — and nothing else, which is why the
 * face rigs live with their scenes rather than in the kit.
 */

interface Beat { at: number; face: keyof typeof EXPR; hex: string; lang: string; text: string; size: number }

/** Cue times, accumulated from the design's own scene durations. */
const BEATS: Beat[] = [
  { at: 0, face: 'confused', hex: '1F1EA-1F1F8', lang: 'Spanish', text: '¡¿Cómo?!', size: 66 },
  { at: 1.3, face: 'thinking', hex: '1F1EB-1F1F7', lang: 'French', text: "Qu'est-ce que c'est ?", size: 44 },
  { at: 2.6, face: 'sweating', hex: '1F1F3-1F1F1', lang: 'Dutch', text: 'Scheveningen', size: 50 },
  { at: 3.9, face: 'dizzy', hex: '1F1EC-1F1F7', lang: 'Greek', text: 'Ευχαριστώ πολύ', size: 46 },
  { at: 5.2, face: 'exploding', hex: '1F1EF-1F1F5', lang: 'Japanese', text: 'ありがとうございます', size: 40 },
  { at: 6.6, face: 'upside', hex: '1F1F0-1F1F7', lang: 'Korean', text: '안녕하십니까?', size: 44 },
  { at: 7.9, face: 'relieved', hex: '1F1F5-1F1F9', lang: 'Portuguese', text: 'Tudo bem…', size: 54 },
  { at: 9.2, face: 'clicked', hex: '1F1EA-1F1F8', lang: 'Spanish', text: '¡Ahora lo entiendo!', size: 46 },
];
const TOTAL = 11.0;

/* ── the parts a face is drawn from ──────────────────────────────────────── */

const dotEye = (key: string, cx: number, cy: number, r: number, open: number) => (
  <ellipse key={key} cx={cx} cy={cy} rx={r} ry={r * clamp(open, 0.06, 1.6)} fill={LINE} />
);

const closedEye = (key: string, cx: number, cy: number, dir: number) => (
  <path key={key} d={`M${cx - 4.6},${cy} Q${cx},${cy + (dir < 0 ? -3.2 : 3.2)} ${cx + 4.6},${cy}`} {...stroke(2)} />
);

function spiralEye(key: string, cx: number, cy: number, rot: number) {
  let d = `M${cx},${cy}`;
  for (let i = 1; i <= 26; i += 1) {
    const a = (i / 26) * Math.PI * 3.4 + rot;
    const r = (i / 26) * 4.6;
    d += ` L${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
  }
  return <path key={key} d={d} {...stroke(1.7)} />;
}

function starEye(key: string, cx: number, cy: number, s: number, rot: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + rot;
    const r = (i % 2 ? 2.4 : 5.6) * s;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return <polygon key={key} points={pts.join(' ')} fill={AMBER} stroke={LINE} strokeWidth={1.6} strokeLinejoin="round" />;
}

const brow = (key: string, bx: number, lift: number, slant: number) => {
  const y = 25.6 - lift;
  return <path key={key} d={`M${bx - 4.8},${y + slant} Q${bx},${y - 2.6} ${bx + 4.8},${y - slant}`} {...stroke(2)} />;
};

const smile = (key: string, w: number, depth: number, y: number) => (
  <path key={key} d={`M${36 - w},${y} Q36,${y + depth} ${36 + w},${y}`} {...stroke(2)} />
);

const openMouth = (key: string, w: number, h: number, y: number) => (
  <ellipse key={key} cx={36} cy={y} rx={w} ry={h} fill={MOUTH_IN} stroke={LINE} strokeWidth={2} />
);

const wavyMouth = (key: string, w: number, amp: number, y: number) => (
  <path key={key} d={`M${36 - w},${y} q${w / 2},${-amp} ${w},0 t${w},0`} {...stroke(2)} />
);

function sparkle(key: string, cx: number, cy: number, r: number, color: string, rot: number, op: number) {
  const p: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + rot;
    const rr = i % 2 ? r * 0.34 : r;
    p.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return <polygon key={key} points={p.join(' ')} fill={color} opacity={op} />;
}

/* ── the eight expressions ───────────────────────────────────────────────── */

interface Expression {
  tilt: number; sx: number; sy: number; origin?: string;
  kids: React.ReactNode[];
  float?: { char: string; x: number; y: number; wob: number };
}

const EXPR: Record<string, (u: number) => Expression> = {
  confused: (u) => ({
    tilt: 7 + cycle(u, 1.5, 2.2), sx: 1, sy: 1,
    kids: [
      brow('bl', 27, 3.4 + cycle(u, 0.9, 0.5), -2.4), brow('br', 45, -0.6, 1.8),
      dotEye('el', 27, 31.4, 3, 1), dotEye('er', 45.4, 30.4, 2.6, 1),
      wavyMouth('m', 12, 3.2 + cycle(u, 0.75, 0.8), 45.6),
    ],
    float: { char: '?', x: 62, y: 8, wob: cycle(u, 1.2, 6) },
  }),
  thinking: (u) => ({
    tilt: -5 + cycle(u, 1.9, 1.6), sx: 1, sy: 1,
    kids: [
      brow('bl', 26.4, 1.0, 2.6), brow('br', 45.6, 1.8, -2.2),
      dotEye('el', 25.6, 29.6, 2.9, 1), dotEye('er', 43.6, 29.6, 2.9, 1),
      <path key="m" d={`M29,46.4 Q36,${45.2 + cycle(u, 1.1, 0.8)} 44,45.2`} {...stroke(2)} />,
    ],
    float: { char: '…', x: 60, y: 12, wob: cycle(u, 1.4, 4) },
  }),
  sweating: (u) => {
    const drip = (u * 1.35) % 1;
    return {
      tilt: cycle(u, 0.26, 1.4),
      sx: 1 + cycle(u, 0.26, 0.008), sy: 1 - cycle(u, 0.26, 0.008),
      kids: [
        brow('bl', 27, 3.6, -1.6), brow('br', 45, 3.6, 1.6),
        dotEye('el', 27, 31, 3.4, 1), dotEye('er', 45, 31, 3.4, 1),
        openMouth('m', 6.2 + cycle(u, 0.3, 0.9), 3.6 + cycle(u, 0.3, 1.0), 45.6),
        <path
          key="drop"
          d="M0,-5.4 C2.9,-1.6 4.2,0.6 4.2,2.3 A4.2,4.2 0 0 1 -4.2,2.3 C-4.2,0.6 -2.9,-1.6 0,-5.4 Z"
          transform={`translate(${52 + drip * 1.4}, ${20 + drip * 17}) scale(${0.55 + 0.45 * clamp(drip * 3, 0, 1)})`}
          fill={BLUE} stroke={LINE} strokeWidth={1.8} strokeLinejoin="round"
          opacity={clamp(drip * 5, 0, 1) * clamp((1 - drip) * 4, 0, 1)}
        />,
      ],
    };
  },
  dizzy: (u) => ({
    tilt: cycle(u, 1.05, 9), sx: 1, sy: 1,
    kids: [
      spiralEye('el', 27, 31, u * 2.6), spiralEye('er', 45, 31, -u * 2.6),
      wavyMouth('m', 11, 3.6, 46),
      ...[0, 1, 2].map((i) => {
        const a = u * 2.1 + (i / 3) * Math.PI * 2;
        return sparkle(`st${i}`, 36 + Math.cos(a) * 17, 8.5 + Math.sin(a) * 3.6, 3.1, AMBER, a, 0.55 + 0.45 * Math.sin(a));
      }),
    ],
  }),
  exploding: (u) => {
    const burst = clamp(u / 0.34, 0, 1);
    const e = ease.outBack(burst);
    return {
      tilt: cycle(u, 0.14, 1.2) * (1 - burst) + cycle(u, 1.3, 1.4),
      sx: 1 + 0.05 * (1 - burst), sy: 1 - 0.04 * (1 - burst),
      kids: [
        brow('bl', 27, 3.8, -2.2), brow('br', 45, 3.8, 2.2),
        dotEye('el', 27, 32.4, 3.6, 1), dotEye('er', 45, 32.4, 3.6, 1),
        openMouth('m', 7.4, 5.0, 47),
        <path key="crack" d="M14.5,27 L21,22.5 L27,27.5 L33,21.5 L39,27 L45.5,21.5 L51,27 L57.5,23" {...stroke(2.2)} opacity={burst} />,
        <g key="blast" opacity={burst}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const a = -Math.PI / 2 + (i - 3) * 0.5;
            const d = 12 + e * (7 + (i % 2) * 4) + cycle(u, 1.1, 0.7, i * 0.2);
            return (
              <circle
                key={i}
                cx={36 + Math.cos(a) * d * 1.2} cy={25 + Math.sin(a) * d}
                r={(5.4 - Math.abs(i - 3) * 0.7) * (0.5 + 0.5 * e)}
                fill={i % 2 ? AMBER : MOUTH_IN} stroke={LINE} strokeWidth={1.6}
              />
            );
          })}
        </g>,
      ],
    };
  },
  upside: (u) => ({
    tilt: 180 + cycle(u, 1.7, 3), sx: 1, sy: 1, origin: '50% 50%',
    kids: [
      dotEye('el', 27, 31, 3, 1), dotEye('er', 45, 31, 3, 1),
      smile('m', 9.6, 5.4 + cycle(u, 1.3, 0.6), 44.4),
    ],
  }),
  relieved: (u) => ({
    tilt: cycle(u, 2.2, 1.4),
    sx: 1 + cycle(u, 1.6, 0.012), sy: 1 - cycle(u, 1.6, 0.012),
    kids: [
      closedEye('el', 27, 31.4, -1), closedEye('er', 45, 31.4, -1),
      smile('m', 8.6, 4.4, 44.8),
      <path key="puff1" d="M50,47 q5,-1.6 9,0" {...stroke(1.7)} opacity={clamp(Math.sin(u * 2.2), 0, 1) * 0.8} transform={`translate(${(u * 6) % 9}, ${-((u * 3) % 4)})`} />,
      <path key="puff2" d="M52,52 q4,-1.4 7.4,0" {...stroke(1.5)} opacity={clamp(Math.sin(u * 2.2 - 1.1), 0, 1) * 0.6} transform={`translate(${(u * 5) % 8}, ${-((u * 2.4) % 4)})`} />,
    ],
  }),
  clicked: (u) => ({
    tilt: cycle(u, 0.9, 2.2),
    sx: 1 + cycle(u, 0.45, 0.02), sy: 1 - cycle(u, 0.45, 0.02),
    kids: [
      starEye('el', 27, 31, 0.92 + 0.08 * Math.sin(u * 6), 0.1),
      starEye('er', 45, 31, 0.92 + 0.08 * Math.sin(u * 6 + 1), -0.1),
      <path key="m" d="M25,43.6 Q36,58 47,43.6 Q36,47.4 25,43.6 Z" fill={MOUTH_IN} stroke={LINE} strokeWidth={2} strokeLinejoin="round" />,
    ],
  }),
};

function Face({ type, u, size, x, y, k }: { type: string; u: number; size: number; x: number; y: number; k: number }) {
  const e = EXPR[type](Math.max(u, 0));
  const on = clamp(k, 0, 1);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: size, height: size,
        transform: `translateY(${(1 - on) * 26}px) scale(${0.72 + 0.28 * on})`,
        transformOrigin: '50% 60%', opacity: clamp(on * 1.6, 0, 1), willChange: 'transform',
      }}
    >
      <div
        style={{
          width: size, height: size,
          transform: `rotate(${e.tilt}deg) scale(${e.sx},${e.sy})`,
          transformOrigin: e.origin ?? '50% 82%',
        }}
      >
        <svg viewBox="0 0 72 72" width={size} height={size} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
          <circle cx={36} cy={36} r={23} fill={YELLOW} />
          <circle cx={36} cy={36} r={23} {...stroke(2)} />
          {e.kids}
        </svg>
      </div>
      {e.float && (
        <div
          style={{
            position: 'absolute', left: (e.float.x / 72) * size, top: (e.float.y / 72) * size + e.float.wob,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.24,
            lineHeight: 1, color: 'var(--text-muted)',
          }}
        >
          {e.float.char}
        </div>
      )}
    </div>
  );
}

/* ── the frame ───────────────────────────────────────────────────────────── */

function Frame({ t }: { t: number }) {
  const starts = BEATS.map((b) => b.at);
  const ends = starts.slice(1).concat([TOTAL]);

  let idx = 0;
  for (let i = 0; i < starts.length; i += 1) if (t >= starts[i] - 0.10) idx = i;
  const beat = BEATS[idx];
  const isLast = idx === BEATS.length - 1;

  /* The box's contents dip and pop at each beat rather than cutting. */
  const sinceSwap = t - (starts[idx] - 0.02);
  const sw = clamp(sinceSwap / 0.22, 0, 1);
  const swapScale = 0.86 + 0.14 * ease.outBack(sw);
  const swapOpacity = 0.15 + 0.85 * sw;

  const boxIn = pop(0.08, 0.5)(t);
  const boxOut = tween(0, 1, TOTAL - 0.42, TOTAL, ease.inCubic)(t);
  const boxNudge = cycle(t - starts[idx], 0.5, 5) * clamp(1 - sinceSwap / 0.5, 0, 1);

  const cheer = clamp((t - starts[BEATS.length - 1]) / 0.5, 0, 1);

  const camScale = 1.10 + cycle(t, TOTAL, 0.012, -0.25);
  const camY = cycle(t, TOTAL, 8, 0.35);

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        transform: `translateY(${camY}px) scale(${camScale})`, transformOrigin: '50% 52%',
      }}
    >
      {/* All eight faces live in one tree, keyed to their beats, so a face can
          still be leaving as the next arrives. */}
      {BEATS.map((b, i) => {
        const inK = pop(starts[i] - 0.06, 0.42)(t);
        const outK = tween(0, 1, ends[i] - 0.26, ends[i] + 0.04, ease.inCubic)(t);
        const k = clamp(inK, 0, 1.06) * (1 - clamp(outK, 0, 1));
        if (k <= 0.004) return null;
        return <Face key={b.face} type={b.face} u={t - starts[i]} k={k} size={400} x={340} y={496} />;
      })}

      {cheer > 0.01 && (
        <svg width={1080} height={1080} viewBox="0 0 1080 1080" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = -Math.PI / 2 + (i - 2.5) * 0.52;
            const d = 210 + ease.outCubic(cheer) * 92 + cycle(t, 1.4, 8, i * 0.2);
            return sparkle(
              `c${i}`, 540 + Math.cos(a) * d * 1.15, 692 + Math.sin(a) * d,
              (i % 2 ? 13 : 19) * (0.3 + 0.7 * cheer),
              i % 2 ? 'var(--brand)' : AMBER, t * 1.1 + i, 0.35 + 0.55 * cheer,
            );
          })}
        </svg>
      )}

      <div
        style={{
          position: 'absolute', left: 540, top: 430,
          transform: `translate(-50%, -100%) translateY(${(1 - clamp(boxIn, 0, 1)) * 26 + boxNudge + boxOut * 18}px) scale(${clamp(boxIn, 0, 1) * (1 - 0.12 * boxOut)})`,
          transformOrigin: '50% 118%', opacity: clamp(boxIn * 1.5, 0, 1) * (1 - boxOut),
        }}
      >
        {/* The payoff line takes the brand colour; the rest sit on a raised
            surface, one step above the card, as in the other scene. */}
        <div
          style={{
            position: 'relative',
            background: isLast ? 'var(--brand)' : 'var(--surface-raised)',
            color: isLast ? '#FFFFFF' : 'var(--text-strong)',
            border: isLast ? 'none' : '1px solid var(--border)',
            borderRadius: 22, padding: '18px 30px 22px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            minWidth: 260, maxWidth: 620,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 24, transform: `scale(${swapScale})`, opacity: swapOpacity }}>
            <img src={flagUrl(beat.hex)} alt="" width={40} height={40} style={{ display: 'block', width: 40, height: 40, margin: '-8px -3px' }} />
            {' '}
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 16, letterSpacing: '0.02em', color: isLast ? 'rgba(255,255,255,.82)' : 'var(--text-muted)' }}>
              {beat.lang}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: beat.size,
              lineHeight: 1.16, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
              transform: `scale(${swapScale})`, opacity: swapOpacity, transformOrigin: '50% 50%',
            }}
          >
            {beat.text}
          </div>
          <div
            style={{
              position: 'absolute', bottom: -10, left: '50%', marginLeft: -12,
              width: 24, height: 24, borderRadius: 6, transform: 'rotate(45deg)',
              background: isLast ? 'var(--brand)' : 'var(--surface-raised)',
              borderRight: isLast ? 'none' : '1px solid var(--border)',
              borderBottom: isLast ? 'none' : '1px solid var(--border)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export const struggleScene: Scene = {
  id: 'struggle',
  duration: TOTAL,
  /*
   * Measured in the browser across the whole eleven seconds, as the other
   * scene's was: the box and the faces span x 285–795 and y 266–935, once the
   * camera's 1.10 zoom and drift are counted. A portrait band, where the
   * greeting's is landscape — this one stacks a dialog box above a face rather
   * than setting two faces side by side, so it is fitted by height and leaves
   * the sides empty rather than being cropped into.
   */
  crop: { left: 275, top: 256, width: 530, height: 689 },
  // The payoff beat: star eyes, sparkles, and the line that lands.
  still: 9.9,
  Frame,
};
