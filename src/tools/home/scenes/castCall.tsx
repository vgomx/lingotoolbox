import * as React from 'react';
import { STAGE, clamp, cycle, ease, pop, tween, type Scene } from '../sceneKit';

/*
 * A cast call: characters step up one at a time and deliver one line in their
 * own language. Ported from the "Cast call" design piece — the same cue times,
 * the same six body profiles, the same speech envelope.
 *
 * Unlike the other two scenes, the faces here are not drawn in the kit's
 * grammar. The piece is built on sixteen original OpenMoji characters — a
 * vampire, an astronaut, a genie — and hand-drawing those in discs and strokes
 * would be redrawing somebody's artwork badly. The drawings are the untouched
 * glyphs; the piece's prep step only tags the eyes, mouth and one or two moving
 * accessories with classes whose transforms read CSS variables, so everything
 * animates by writing custom properties on a wrapper. Nothing here reaches into
 * the SVG.
 */

/** How long one character holds the stage. */
const SLOT = 1.5;
/** How many step up in one pass. Four at 1.5s matches the other scenes' 6s. */
const PER_PASS = 4;
const TOTAL = PER_PASS * SLOT;

interface Member {
  id: string;
  move: 'nod' | 'sway' | 'float' | 'creep' | 'lurch' | 'bounce';
  lang: string;
  text: string;
  gloss: string;
  /** Type size for the line. The long ones step down so they stay on one line. */
  size: number;
  accent: string;
  /** How the tagged accessories move — ears, wings, a cape, a beard. */
  parts: string[];
}

/**
 * The cast, in the piece's order.
 *
 * The accents are the piece's own, keyed to the artwork rather than to the
 * app's tools: the vampire's red and the elf's green mean the character, and a
 * --tool-* token here would be saying something the colour does not mean.
 */
const CAST: Member[] = [
  { id: 'scientist', move: 'nod', lang: 'German', text: 'Faszinierend. Notieren wir das.', gloss: 'Fascinating. Let’s write that down.', size: 44, accent: '#33C4F0', parts: ['swirl'] },
  { id: 'princess', move: 'sway', lang: 'French', text: 'Enchantée, vraiment.', gloss: 'Delighted, truly.', size: 56, accent: '#F4AA41', parts: ['swing'] },
  { id: 'turban', move: 'nod', lang: 'Punjabi', text: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', gloss: 'Sat sri akal — a greeting.', size: 54, accent: '#2ED3A0', parts: ['swing'] },
  { id: 'tuxedo', move: 'sway', lang: 'Italian', text: 'Il piacere è mio.', gloss: 'The pleasure is mine.', size: 56, accent: '#B7B9CB', parts: ['wiggle'] },
  { id: 'veil', move: 'sway', lang: 'Portuguese', text: 'Hoje eu digo sim.', gloss: 'Today I say yes.', size: 56, accent: '#F4F4F8', parts: ['swing'] },
  { id: 'supervillain', move: 'creep', lang: 'Russian', text: 'Мир будет моим.', gloss: 'The world will be mine.', size: 54, accent: '#7A5AE0', parts: ['swing'] },
  { id: 'elf', move: 'nod', lang: 'Finnish', text: 'Metsä muistaa kaiken.', gloss: 'The forest remembers everything.', size: 50, accent: '#B1CC33', parts: ['earL', 'earR'] },
  { id: 'fairy', move: 'float', lang: 'Irish', text: 'Míle fáilte romhat.', gloss: 'A thousand welcomes.', size: 52, accent: '#2ED3A0', parts: ['flapL', 'flapR'] },
];

/* ── the stage ───────────────────────────────────────────────────────────── */

/** Where the character stands, and how big they are drawn. */
const FLOOR = 660;
const FIGURE = 380;
/** The bubble's baseline — its tail sits here and it grows upward. */
const BUBBLE_BASE = 400;

/* ── the glyphs ──────────────────────────────────────────────────────────── */

/*
 * Fetched once each and kept for the life of the page.
 *
 * Not bundled: sixteen drawings is about 100 KB of markup, and the hero is the
 * first thing that paints on the dashboard. They have to be in the document
 * rather than in an <img>, because an image is a closed box no custom property
 * can reach into, and the whole face rig is custom properties.
 */
const glyphs = new Map<string, string>();
const inflight = new Map<string, Promise<void>>();

function load(id: string): Promise<void> {
  if (glyphs.has(id)) return Promise.resolve();
  const running = inflight.get(id);
  if (running) return running;
  const p = fetch(`${import.meta.env.BASE_URL}cast/${id}.svg`)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((t) => { glyphs.set(id, t.replace('<svg ', '<svg width="100%" height="100%" ')); })
    // A glyph that will not load leaves the stage empty for its turn rather
    // than taking the hero down with it. The line still gets said.
    .catch(() => { glyphs.set(id, ''); })
    .finally(() => { inflight.delete(id); });
  inflight.set(id, p);
  return p;
}

/**
 * Which four step up this time.
 *
 * Advanced once per mount, so the scene shows a different quartet each time it
 * comes round and all sixteen are seen over a few passes — without making one
 * pass four times as long as the scenes either side of it.
 */
let cursor = 0;

/* ── the choreography ────────────────────────────────────────────────────── */

/** A smooth one-shot swell centred on `at` — a bow, a dip, a stumble. */
const bump = (u: number, at: number, w = 0.3) => {
  const p = clamp(1 - Math.abs(u - at) / w, 0, 1);
  return p * p * (3 - 2 * p);
};

/** Secondary motion on the tagged accessories. */
function partVars(modes: string[], t: number, g: number, tilt: number, dy: number, phase: number) {
  const v: Record<string, string> = {};
  modes.forEach((mode, i) => {
    const n = i + 1;
    let r = 0; let x = 0; let y = 0;
    switch (mode) {
      case 'swing': r = -tilt * 0.45 + cycle(t, 1.15, 2.5, phase); y = clamp(dy * -0.08, -2.5, 2.5); break;
      case 'cape': r = -tilt * 0.6 + cycle(t, 1.4, 3.5, phase); y = clamp(dy * -0.1, -3, 3); break;
      case 'wiggle': r = cycle(t, 0.5, 3) * (0.4 + 0.6 * g); break;
      case 'bob': y = cycle(t, 0.9, 1.8); r = cycle(t, 1.4, 3); break;
      case 'beard': r = cycle(t, 1.0, 2) + g * cycle(t, 0.3, 2.2); y = g * cycle(t, 0.22, 0.9); break;
      case 'flapL': r = -(4 + Math.abs(Math.sin(t * Math.PI * 2.6)) * (8 + 8 * g)); break;
      case 'flapR': r = 4 + Math.abs(Math.sin(t * Math.PI * 2.6)) * (8 + 8 * g); break;
      case 'earL': r = cycle(t, 0.7, 6, phase) + 2; break;
      case 'earR': r = -cycle(t, 0.7, 6, phase) - 2; break;
      case 'flutter': r = cycle(t, 0.6, 5); x = cycle(t, 0.8, 1.2); break;
      case 'boing': y = -Math.abs(Math.sin(t * Math.PI * 3.2)) * 2 * g; r = cycle(t, 0.5, 4); break;
      case 'swirl': r = cycle(t, 0.8, 7); y = cycle(t, 0.55, 1.2); break;
      default: r = cycle(t, 0.8, 1.6); break; /* wobble */
    }
    v[`--p${n}r`] = `${r.toFixed(2)}deg`;
    v[`--p${n}x`] = `${x.toFixed(2)}px`;
    v[`--p${n}y`] = `${y.toFixed(2)}px`;
  });
  return v;
}

/**
 * Six ways to carry a body, at `t` seconds into a turn.
 *
 * `on` is the step-up from the back that everyone arrives on; `g` is how hard
 * they are talking, which each profile leans on differently.
 */
function body(move: Member['move'], t: number, g: number, phase: number) {
  const on = tween(0, 1, 0, 0.45)(t);
  let dx = 0; let dy = 0; let tilt = 0; let squash = 0;
  let scl = 0.88 + 0.12 * on;

  switch (move) {
    case 'bounce': {                                  /* hops, squashing on the landing */
      const air = Math.abs(Math.sin(t * Math.PI * 2.1));
      dy = -air * 44 * on;
      dx = cycle(t, 1.9, 34, phase) * on;
      tilt = Math.cos(t * Math.PI * 2.1) * 7 * on;
      squash = (1 - air) * 0.09 * on - air * 0.04;
      scl += bump(t, 1.25, 0.5) * 0.08;
      break;
    }
    case 'sway': {                                    /* waltz arcs, one deep curtsy */
      dx = Math.sin(t * 2.4 + phase) * 52 * on;
      dy = Math.abs(Math.cos(t * 2.4 + phase)) * 10 * on;
      tilt = Math.sin(t * 2.4 + phase + 0.6) * 9 * on;
      const dip = bump(t, 1.3, 0.45);
      dy += dip * 26; tilt += dip * 6; squash = dip * 0.06;
      break;
    }
    case 'float': {                                   /* weightless drift */
      dx = Math.sin(t * 1.6 + phase) * 58 * on;
      dy = (Math.sin(t * 2.3 + phase + 1) * 36 - 16) * on;
      tilt = Math.sin(t * 1.4 + phase) * 9 * on;
      scl += Math.sin(t * 2.0) * 0.035;
      dy -= g * Math.abs(Math.sin(t * Math.PI * 2.6)) * 8;
      break;
    }
    case 'creep': {                                   /* prowls in, then looms */
      dx = (70 - tween(0, 95, 0.1, 1.9)(t)) * on + cycle(t, 3.2, 10);
      tilt = -6 + cycle(t, 3.2, 5, phase);
      dy = cycle(t, 1.1, 3);
      scl += tween(0, 0.24, 0.35, 1.7, ease.inOutCubic)(t);
      const dart = bump(t, 1.9, 0.22);
      dx += dart * -26; tilt += dart * -5;
      break;
    }
    case 'lurch': {                                   /* heavy stagger, one stumble */
      dx = Math.sin(t * 0.9 + phase) * 44 * on;
      tilt = Math.sin(t * 1.5 + phase) * 15 * on;
      dy = Math.abs(Math.sin(t * 3)) * 7 - bump(t, 0.9, 0.2) * 10;
      const trip = bump(t, 1.6, 0.25);
      dy += trip * 12; tilt += trip * 9; squash = trip * 0.07;
      break;
    }
    default: {                                        /* nod: draws breath, then bows */
      dx = cycle(t, 2.8, 16, phase) * on;
      dy = -bump(t, 0.55, 0.35) * 14;
      const bow = bump(t, 0.85, 0.3) + bump(t, 1.35, 0.3);
      tilt = bow * 10 + cycle(t, 1.3, 2.4) * g;
      dy += bow * 20; squash = bow * 0.05;
      scl += bump(t, 0.55, 0.35) * 0.05;
      break;
    }
  }
  return { dx, dy, tilt, scl, squash };
}

/* ── the pieces ──────────────────────────────────────────────────────────── */

function Character({ spec, u, k, talk, phase }: {
  spec: Member; u: number; k: number; talk: number; phase: number;
}) {
  const svg = glyphs.get(spec.id);
  if (!svg) return null;

  const t = Math.max(u, 0);
  const pop01 = clamp(k, 0, 1);

  /* A fast pinch of the eyes every couple of seconds, offset per character so
     the cast never blinks in unison. */
  const phaseB = (t + 0.35 + phase * 0.4) % 2.2;
  const blink = phaseB < 0.13 ? Math.abs(phaseB - 0.065) / 0.065 : 1;
  const g = clamp(talk * 2, 0, 1);
  const { dx, dy, tilt, scl, squash } = body(spec.move, t, g, phase);
  const syllable = g * -Math.abs(Math.sin(t * Math.PI * 3.6)) * 5;
  const sy = 1 - talk * 0.05 - squash;
  const sx = 2 - sy;

  const rig = {
    '--omb': blink * (1 + talk * 0.3),
    '--ogx': `${cycle(t, 2.7, 0.9, phase).toFixed(2)}px`,
    '--ogy': `${cycle(t, 3.3, 0.45, phase + 0.3).toFixed(2)}px`,
    '--omx': 1 + talk * 0.16,
    '--omy': 1 + talk * 2.0,
    '--omj': `${(talk * 0.9).toFixed(2)}px`,
    ...partVars(spec.parts, t, g, tilt, dy + syllable, phase),
  } as React.CSSProperties;

  return (
    <div
      style={{
        position: 'absolute', left: -FIGURE / 2, top: -FIGURE / 2, width: FIGURE, height: FIGURE,
        transform: `translateY(${(1 - pop01) * 40}px) scale(${0.76 + 0.24 * pop01})`,
        opacity: clamp(pop01 * 1.5, 0, 1),
      }}
    >
      <div
        style={{
          width: FIGURE, height: FIGURE,
          transform: `translate(${dx}px,${dy + syllable}px) rotate(${tilt}deg) scale(${sx * scl},${sy * scl})`,
          // 88% down the box: a body pivots at its feet, not its middle.
          transformOrigin: '50% 88%',
          ...rig,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

function Bubble({ spec, k, nudge }: { spec: Member; k: number; nudge: number }) {
  return (
    <div
      style={{
        position: 'absolute', left: STAGE / 2, top: BUBBLE_BASE,
        transform: `translate(-50%,-100%) translateY(${(1 - k) * 22 + nudge}px) scale(${0.9 + 0.1 * clamp(k, 0, 1)})`,
        transformOrigin: '50% 120%',
        opacity: clamp(k * 1.4, 0, 1),
      }}
    >
      {/* --surface-raised for the same reason the greeting's bubble uses it: the
          bubble is a step up from the card it sits on, in either theme. */}
      <div
        style={{
          position: 'relative', background: 'var(--surface-raised)', borderRadius: 24,
          padding: '16px 26px 19px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}
      >
        {/* 26, not the piece's 12: the piece is a 1080 square played at full
            size, and this crop lands in the hero at about a third of that. The
            line survives the reduction; a 12px label arrives at four pixels. */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: spec.accent }}>
          {spec.lang}
        </div>
        {/* The English gloss the piece carries is gone for the same reason, and
            it is no loss here: the greeting scene next door does not translate
            its hellos either. The meaning is in the character saying it. */}
        <div
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: spec.size,
            lineHeight: 1.2, letterSpacing: 'var(--ls-tight)', color: 'var(--text-strong)',
          }}
        >
          {spec.text}
        </div>
        <div
          style={{
            position: 'absolute', bottom: -9, left: '50%', marginLeft: -10, width: 20, height: 20,
            background: 'var(--surface-raised)', borderRadius: 7, transform: 'rotate(45deg)',
          }}
        />
      </div>
    </div>
  );
}

function Frame({ t }: { t: number }) {
  /* The quartet is chosen once per mount and held, so a re-render mid-pass
     cannot swap the character out from under the line they are saying. */
  const [start] = React.useState(() => {
    const s = cursor;
    cursor = (cursor + PER_PASS) % CAST.length;
    return s;
  });
  const line = React.useMemo(
    () => Array.from({ length: PER_PASS }, (_, n) => CAST[(start + n) % CAST.length]),
    [start],
  );

  const [, setReady] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    Promise.all(line.map((m) => load(m.id))).then(() => { if (live) setReady((n) => n + 1); });
    return () => { live = false; };
  }, [line]);

  return (
    <>
      {line.map((spec, n) => {
        const from = n * SLOT;
        const to = from + SLOT;
        /* Arrives on a pop, leaves a third of a second early, so the stage is
           never empty and never holds two of them at full strength. */
        const inK = pop(from - 0.04, 0.46)(t);
        const outK = tween(0, 1, to - 0.34, to + 0.02, ease.inCubic)(t);
        const k = clamp(inK, 0, 1.06) * (1 - clamp(outK, 0, 1));
        if (k <= 0.004) return null;

        const u = t - from;
        /* The speech envelope: two detuned sines, gated to the middle of the
           turn so nobody talks before they have arrived or after they have
           turned to go. */
        const gate = clamp((u - 0.34) / 0.16, 0, 1) * clamp((SLOT - 0.42 - u) / 0.22, 0, 1);
        const env = 0.5 + 0.5 * Math.sin(u * 21 + n) * 0.62 + 0.24 * Math.sin(u * 33.7 + n * 2.1);
        const talk = clamp(gate * (0.16 + 0.72 * clamp(env, 0, 1)), 0, 1);
        const slide = (1 - clamp(inK, 0, 1)) * 120 + clamp(outK, 0, 1) * -120;

        return (
          <React.Fragment key={spec.id}>
            <div style={{ position: 'absolute', left: STAGE / 2 + slide, top: FLOOR }}>
              <Character spec={spec} u={u} k={k} talk={talk} phase={n * 0.61} />
            </div>
            <Bubble spec={spec} k={k} nudge={cycle(u, 0.9, 4) * clamp(1 - u / 1.1, 0, 1)} />
          </React.Fragment>
        );
      })}
    </>
  );
}

export const castCallScene: Scene = {
  id: 'cast-call',
  duration: TOTAL,
  /* The band the piece actually paints in: the bubble's top edge down to the
     character's feet, wide enough for the full sideways swing of a creep. */
  crop: { left: 210, top: 250, width: 660, height: 600 },
  /* Mid-turn on the first character, where the line is up and the body is at
     the top of its bow. */
  still: 0.9,
  /* People, not a picture of people — the card's edge takes their legs. */
  bleed: 'bottom',
  Frame,
};
