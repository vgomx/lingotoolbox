import * as React from 'react';
import { STAGE, clamp, cycle, ease, pop, tween, type Scene } from './sceneKit';

/*
 * The toolbox bounces a wrench on its tongue. Ported from the "Toolbox Tongue
 * Front" design piece — the same cue times, the same three tosses, the same
 * camera drift.
 *
 * It is the app's own mark given a face: the logo is a toolbox, and this is
 * that toolbox pleased with itself. Which is why it belongs at the end of a
 * session and nowhere else — a celebration that plays on arrival somewhere is
 * not a celebration, it is décor.
 *
 * Depth is real rather than drawn. The lid tips back on a rotateX inside a
 * perspective, and the wrench grows toward the camera at the top of each toss,
 * so the toss reads as coming at you rather than as getting bigger.
 */

/** The piece's own square, drawn inside the 1080 stage. */
const SZ = 880;

/*
 * Where each beat starts, from the piece's scene list — Closed 0.8, Open 0.65,
 * Tongue 0.75, Bounce 0.9, Again 0.9, Flip 1.2, Rest 1.1, and one of this
 * screen's own: Become.
 *
 * Written as durations and summed rather than as hand-added constants, because
 * that is how the piece states them and hand-adding is how a cue table drifts
 * from the thing it is describing.
 *
 * Rest is 1.1 rather than the piece's 1.6. That last half second was the beat
 * before the loop came round again, and this one does not come round — it ends
 * on the check, so the pause belongs to the morph instead.
 */
const BEATS = [
  ['closed', 0.8], ['open', 0.65], ['tongue', 0.75], ['bounce', 0.9],
  ['again', 0.9], ['flip', 1.2], ['rest', 1.1], ['become', 1.3],
] as const;

const CUE = (() => {
  const out = {} as Record<(typeof BEATS)[number][0], number>;
  let at = 0;
  for (const [name, dur] of BEATS) { out[name] = at; at += dur; }
  return out;
})();

const TOTAL = BEATS.reduce((n, [, d]) => n + d, 0);

/* The piece's palette: the brand violet, with a darker lid top and a cavity
   dark enough to read as inside rather than as another face of the box. */
const BOX = { top: '#5238c9', body: '#6A4CF0', mouth: '#1d1245' };
/* OpenMoji's own check mark button, 2705, read out of the file rather than
   eyeballed: the green of its plate and the white of its tick. */
const CHECK_PLATE = '#B1CC33';
const CHECK_TICK = '#FFFFFF';
const GREY = '#9b9b9a';
const LGREY = '#d0cfce';
const PINK = '#ffa7c0';
const PINK_LINE = '#e67a94';
const ACCENT = '#2ED3A0';
const AMBER = '#F4AA41';

/** Mixes two hex colours, so the plate can turn green rather than cut to it. */
function mix(a: string, b: string, k: number) {
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const to = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${to(r1 + (r2 - r1) * k)}${to(g1 + (g2 - g1) * k)}${to(b1 + (b2 - b1) * k)}`;
}

/**
 * A rounded rectangle with its own radius top and bottom.
 *
 * The whole morph is this one function read twice. The toolbox's body is square
 * across the top, where the lid meets it, and rounded below; OpenMoji's check
 * plate is a square rounded a little on all four. So the two are the same shape
 * with different numbers, and turning one into the other is interpolation
 * rather than a cross-fade between two drawings.
 */
function roundRect(x0: number, y0: number, x1: number, y1: number, rt: number, rb: number) {
  return `M${x0 + rt},${y0} H${x1 - rt} A${rt},${rt} 0 0 1 ${x1},${y0 + rt} V${y1 - rb} `
    + `A${rb},${rb} 0 0 1 ${x1 - rb},${y1} H${x0 + rb} A${rb},${rb} 0 0 1 ${x0},${y1 - rb} `
    + `V${y0 + rt} A${rt},${rt} 0 0 1 ${x0 + rt},${y0} Z`;
}

/** OpenMoji 2705's tick, exactly as the file draws it — a filled sweep. */
const TICK = 'M30.66,30.538c-1.85-2.61-6.18-0.11-4.32,2.52c3.19,4.51,5.87,9.25,7.91,14.38'
  + 'c0.84,2.09,4.23,2.65,4.83,0c2.83-12.6,8.21-27.17,20.68-33c2.91-1.36,0.38-5.67-2.52-4.32'
  + 'c-11.43,5.35-17.68,17.36-21.23,29.25C34.45,36.318,32.68,33.378,30.66,30.538z';

const line = (w = 2) => ({
  fill: 'none' as const, stroke: '#000', strokeWidth: w,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

/** The wrench, drawn once around its own centre so it can be spun and scaled. */
const WRENCH = 'M-16.4,-2.6 L-11,-2.6 A2.6,2.6 0 0 1 -11,2.6 L-16.4,2.6 A6,6 0 0 0 -5.42,2.2 '
  + 'L14.5,2.2 A2.2,2.2 0 0 0 14.5,-2.2 L-5.42,-2.2 A6,6 0 0 0 -16.4,-2.6 Z';

function sparkle(key: string, cx: number, cy: number, r: number, color: string, rot: number, op: number) {
  const p: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + rot;
    const rr = i % 2 ? r * 0.34 : r;
    p.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return <polygon key={key} points={p.join(' ')} fill={color} opacity={op} />;
}

/** One stacked drawing layer. Every layer shares the 72-unit grid. */
function Layer({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 72 72" width={SZ} height={SZ}
      style={{ position: 'absolute', left: 0, top: 0, display: 'block', overflow: 'visible' }}
    >
      {children}
    </svg>
  );
}

function Tongue({ L, th, squish }: { L: number; th: number; squish: number }) {
  if (L <= 0.4) return null;
  const r = Math.min(7, L * 0.85);
  const yTip = 36 + L;
  const d = `M34,36 L48,36 L48,${yTip - r} Q48,${yTip} 41,${yTip} Q34,${yTip} 34,${yTip - r} Z`;
  return (
    <g transform={`rotate(${th} 41 36)`}>
      <g transform={`translate(41,36) scale(${squish},1) translate(-41,-36)`}>
        <path d={d} fill={PINK} stroke="#000" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {L > 15 && (
          <path
            d={`M41,${36 + Math.min(7, L * 0.25)} L41,${yTip - 8.5}`}
            fill="none" stroke={PINK_LINE} strokeWidth={2} strokeLinecap="round"
          />
        )}
      </g>
    </g>
  );
}

/**
 * Where the wrench is in its arc, across all three tosses at once.
 *
 * Summed rather than switched between, so a toss that has finished keeps the
 * rotation it added — the flip's full turn has to stay turned — while only the
 * one in flight contributes height.
 */
function tossState(T: number, tosses: { s: number; d: number; h: number; spin: number }[]) {
  let yOff = 0;
  let rot = 0;
  let launch = 0;
  let land = 0;
  for (const t of tosses) {
    const u = (T - t.s) / t.d;
    if (u > 0 && u < 1) {
      yOff -= 4 * t.h * u * (1 - u);
      rot += t.spin * ease.inOutSine(u);
    } else if (u >= 1) rot += t.spin;
    launch = Math.max(launch, Math.sin(Math.PI * clamp((T - (t.s - 0.16)) / 0.32, 0, 1)));
    land = Math.max(land, Math.sin(Math.PI * clamp((T - (t.s + t.d - 0.05)) / 0.34, 0, 1)));
  }
  return { yOff, rot, launch, land };
}

function Frame({ t: T }: { t: number }) {
  const tosses = [
    { s: CUE.bounce + 0.15, d: 0.6, h: 8, spin: 26 },
    { s: CUE.again + 0.15, d: 0.62, h: 10, spin: -32 },
    { s: CUE.flip + 0.2, d: 0.85, h: 15, spin: 360 },
  ];
  const toss = tossState(T, tosses);
  const airK = clamp(-toss.yOff / 15, 0, 1);

  /* Body language: a slow breath, a squash on each launch and catch, and a
     wiggle of relief once the last one is caught. */
  const breath = cycle(T, TOTAL / 8, 0.009);
  const squash = 0.05 * toss.land + 0.03 * toss.launch;
  const wigWin = clamp((T - CUE.rest) / 0.15, 0, 1) * (1 - clamp((T - (CUE.rest + 0.6)) / 0.25, 0, 1));
  const wig = cycle(T - CUE.rest, 0.4, 3.2) * wigWin;
  const sy = 1 + breath - squash;
  const sx = 1 - breath * 0.7 + squash * 0.7;

  /* Opens at the start and shuts again at the end, so the piece finishes on a
     closed mouth however long it is left on screen. */
  const openIn = tween(0, 1, CUE.open + 0.05, CUE.open + 0.5, ease.outBack)(T);
  const closeOut = tween(0, 1, CUE.rest + 0.6, CUE.rest + 0.9, ease.inCubic)(T);
  const openGate = clamp(openIn, 0, 1.15) * (1 - closeOut);
  const tongueGate = clamp(tween(0, 1, CUE.tongue + 0.05, CUE.tongue + 0.5, ease.outBack)(T), 0, 1.1)
    * (1 - tween(0, 1, CUE.rest + 0.4, CUE.rest + 0.7, ease.inCubic)(T));
  const wrenchGate = clamp(pop(CUE.tongue + 0.3, 0.35)(T), 0, 1.1)
    * (1 - tween(0, 1, CUE.rest + 0.4, CUE.rest + 0.65, ease.inCubic)(T));

  /* The lid tips back in 3D, bumping wider on each toss. */
  const lidX = (9 + cycle(T, TOTAL / 8, 1.6, 0.5) + 9 * toss.launch + 4 * toss.land) * openGate;
  const openK = clamp(lidX / 26, 0, 1);
  const cavH = 7.5 * openK;

  /* The tongue hangs down the front and springs on launch and catch. */
  const L = (20 + cycle(T, TOTAL / 8, 0.9, 0.25) - 3.2 * toss.launch - 2.4 * toss.land) * tongueGate;
  const th = cycle(T, TOTAL / 6, 1.8, 0.1) + 1.5 * toss.launch;
  const squish = 1 - 0.05 * toss.launch;
  const rad = (th * Math.PI) / 180;
  const tipX = 41 - (L - 1.5) * Math.sin(rad);
  const tipY = 36 + (L - 1.5) * Math.cos(rad);

  const wScale = (1 + 1.15 * airK) * wrenchGate;
  const wx = tipX;
  const wy = tipY - 2 + toss.yOff * 0.55;
  const wrot = -8 + toss.rot + cycle(T, TOTAL / 6, 2.2, 0.4);

  /* The eyes converge on the wrench as it comes at the camera, and turn into
     happy arcs once it is caught for the last time. */
  const blinks = [CUE.closed + 0.4, CUE.open + 0.1, CUE.again + 0.05, CUE.rest + 0.75];
  let eyeOpen = 1;
  for (const b of blinks) eyeOpen = Math.min(eyeOpen, 1 - clamp(1 - Math.abs(T - b) / 0.1, 0, 1));
  const conv = 1.5 * airK;
  const pdy = 0.8 - 3.0 * airK;
  const happyEyes = T >= CUE.rest + 0.05 && T < CUE.rest + 0.55;

  const flipCatch = tosses[2].s + tosses[2].d;
  const cheer = clamp((T - flipCatch + 0.05) / 0.3, 0, 1) * (1 - clamp((T - (flipCatch + 0.6)) / 0.3, 0, 1));

  /*
   * Becoming the check.
   *
   * `m` carries the plate: the body's box rises to where the lid was and turns
   * OpenMoji's green, so the lid is absorbed rather than dropped. `tick` is the
   * mark itself, landing a beat later on an overshoot — the plate has to be
   * green before the tick means anything on it.
   */
  const m = tween(0, 1, CUE.become, CUE.become + 0.55, ease.inOutCubic)(T);
  const tick = clamp(pop(CUE.become + 0.42, 0.45)(T), 0, 1.06);

  /* The lid goes as the body arrives where it was standing. */
  const lidFade = 1 - clamp(m * 1.6, 0, 1);

  const camScale = 1.05 + cycle(T, TOTAL, 0.012, -0.25);
  const camY = cycle(T, TOTAL, 7, 0.35);

  const ex = 29;
  const exr = 45;
  const ey = 30.2;
  const pr = 2.9;

  return (
    <div style={{ position: 'absolute', inset: 0, transform: `translateY(${camY}px) scale(${camScale})`, transformOrigin: '50% 54%' }}>
      <div
        style={{
          position: 'absolute', left: (STAGE - SZ) / 2, top: 84, width: SZ, height: SZ,
          perspective: '1300px', perspectiveOrigin: '50% 26%',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            transform: `rotate(${wig}deg) scale(${sx},${sy})`,
            transformOrigin: '50% 80%', transformStyle: 'preserve-3d',
          }}
        >
          {/*
            * The ground it stands on, widening as it squashes.
            *
            * Not the piece's own near-black: that was composed against an ink
            * stage, and this one is dropped onto whatever surface the screen
            * has. At full strength on a light theme it read as a second object
            * rather than as a shadow. Black at a tenth is a soft grey on paper
            * and all but gone on ink, which is what a shadow does on each.
            */}
          <Layer>
            <ellipse
              cx={36} cy={61 + (56 - 61) * m}
              rx={(27 + 12 * squash) * (1 - 0.38 * m)} ry={2.8}
              fill="#000" opacity={0.1}
            />
          </Layer>

          {/* The cavity behind the tipped lid. Drawn under it, so the lid's own
              edge is what closes over it. */}
          <Layer>
            <path
              d={`M14,36 L14,${36 - cavH + 1.5} Q14,${36 - cavH} 15.5,${36 - cavH} L56.5,${36 - cavH} Q58,${36 - cavH} 58,${36 - cavH + 1.5} L58,36 Z`}
              fill={BOX.mouth} stroke="#000" strokeWidth={2} strokeLinejoin="round"
              opacity={openK > 0.05 ? 1 : 0}
            />
          </Layer>

          {/* The lid, tipping back around the seam — a real rotateX rather than
              a drawn one, which is what makes the handle foreshorten. */}
          <div style={{ position: 'absolute', inset: 0, transform: `rotateX(${lidX}deg)`, transformOrigin: `50% ${(36 / 72) * 100}%`, opacity: lidFade }}>
            <Layer>
              <path fill={GREY} d="M30,26v-4c0-1.1,0.9-2,2-2h8c1.1,0,2,0.9,2,2v4h-4v-2h-4v2H30z" />
              <path fill={BOX.top} d="M14,26h44c1.1,0,2,0.9,2,2v8H12v-8C12,26.9,12.9,26,14,26z" />
              <path {...line(2)} d="M30,26v-4c0-1.1,0.9-2,2-2h8c1.1,0,2,0.9,2,2v4" />
              <path {...line(2)} d="M12,36v-8c0-1.1,0.9-2,2-2h44c1.1,0,2,0.9,2,2v8" />
              {happyEyes ? (
                <g>
                  <path d={`M${ex - 4.2},${ey + 1.4} Q${ex},${ey - 3.6} ${ex + 4.2},${ey + 1.4}`} {...line(2)} />
                  <path d={`M${exr - 4.2},${ey + 1.4} Q${exr},${ey - 3.6} ${exr + 4.2},${ey + 1.4}`} {...line(2)} />
                </g>
              ) : (
                <g>
                  <ellipse cx={ex + conv} cy={ey + pdy} rx={pr} ry={pr * Math.max(0.08, eyeOpen)} fill="#000" />
                  <ellipse cx={exr - conv} cy={ey + pdy} rx={pr} ry={pr * Math.max(0.08, eyeOpen)} fill="#000" />
                </g>
              )}
            </Layer>
          </div>

          {/* The body, and what it turns into. Toolbox: 12..60 across, 36..58
              down, square where the lid meets it. Check plate: 20..53 square,
              lightly rounded all round. One path, read at `m`. */}
          <Layer>
            {(() => {
              const x0 = 12 + (20 - 12) * m;
              const x1 = 60 + (53 - 60) * m;
              const y0 = 36 + (20 - 36) * m;
              const y1 = 58 + (53 - 58) * m;
              const d = roundRect(x0, y0, x1, y1, 0.66 * m, 2 + (0.66 - 2) * m);
              return (
                <>
                  <path fill={mix(BOX.body, CHECK_PLATE, m)} d={d} />
                  <path {...line(2)} d={d} />
                </>
              );
            })()}
          </Layer>

          <Layer>
            <Tongue L={L} th={th} squish={squish} />
          </Layer>

          {/* The stroke is divided by the scale so the outline stays 2 units
              wide however far toward the camera the wrench has come. */}
          {wScale > 0.02 && (
            <Layer>
              <g transform={`translate(${wx},${wy}) rotate(${wrot}) scale(${wScale})`}>
                <path
                  d={WRENCH} fill={LGREY} stroke="#000"
                  strokeWidth={2 / Math.max(wScale, 0.3)}
                  strokeLinejoin="round" strokeLinecap="round"
                />
              </g>
            </Layer>
          )}

          {/* The mark, once the plate is green enough to hold it. Popped from
              the plate's own centre so it lands on the box rather than flying
              in from somewhere the piece has never been. */}
          {tick > 0.01 && (
            <Layer>
              <g transform={`translate(36.5,36.5) scale(${tick}) translate(-36.5,-36.5)`}>
                <path d={TICK} fill={CHECK_TICK} />
                <path d={TICK} {...line(2)} />
              </g>
            </Layer>
          )}

          {cheer > 0.01 && (
            <Layer>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                /*
                 * A tighter arc than the piece's.
                 *
                 * At its own numbers — a radius of 30 to 40, stretched half
                 * again across — the six of them swing from -120 to 1200 of a
                 * 1080 stage. The piece could do that because it clipped them
                 * at its own frame: two survived, the rest were cut, and that
                 * was the look. Nothing is clipped here, so the choice was a
                 * band wide enough to hold that swing with the toolbox shrunk
                 * to two fifths of it, or an orbit that fits. This is the
                 * orbit: same six, same colours, same beat, sitting just off
                 * the lid where all of them can be seen.
                 */
                const a = -Math.PI / 2 + (i - 2.5) * 0.62;
                const d = 21 + ease.outCubic(cheer) * 6 + cycle(T, 1.4, 1.2, i * 0.2);
                return sparkle(
                  `c${i}`, 36 + Math.cos(a) * d, 34 + Math.sin(a) * d,
                  (i % 2 ? 2.2 : 3.1) * (0.3 + 0.7 * cheer),
                  i % 2 ? ACCENT : AMBER, T * 1.1 + i, 0.35 + 0.6 * cheer,
                );
              })}
            </Layer>
          )}
        </div>
      </div>
    </div>
  );
}

export const toolboxTongueScene: Scene = {
  id: 'toolbox-tongue',
  duration: TOTAL,
  /*
   * The band the piece paints in — measured, deliberately loose, and centred on
   * the toolbox rather than on the ink.
   *
   * Sampled across a whole run, the ink reaches 117 and 1101 across. Centring
   * the window on that span would put its middle at 609, which is where the
   * *wrench* lives — it rides at 41 of the 72-unit grid, right of the box's 36.
   * The subject is the toolbox, and after the morph it is the check; both are
   * centred on 540, so the window is, and the extra room falls on the side the
   * flip throws the wrench into.
   *
   * The top is 20 rather than 80 for the same reason, measured the same way:
   * with the window on the ink the finished check sat 22px above the middle of
   * a 326px box, because the toolbox that precedes it is taller and hangs
   * lower. The check is the state this screen is left holding, so it is the one
   * centred, and the toolbox rides a little high while it plays.
   *
   * Loose on every side on purpose. Nothing is cut: measured against the box's
   * own edges across a whole run, the overflow is zero on all four — not the
   * sparkles at their widest, not the wrench at the top of the flip where it is
   * more than twice its resting size, not the tick overshooting as it lands.
   */
  crop: { left: -40, top: 20, width: 1160, height: 900 },
  /* The check, finished. Someone who has asked not to be shown motion is shown
     the state the piece exists to arrive at rather than a moment inside it. */
  still: TOTAL,
  Frame,
};
