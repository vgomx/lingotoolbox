// Generates the social card used as the README hero.
//
// Committed as a script rather than as a binary dropped in by hand, for the same
// reason the icons are: it can be traced back to the art it came from and
// regenerated when the brand moves.  npm run build:social-card
//
// Everything here is vector from the design system. Nothing draws live text —
// Baloo 2 is requested from Google Fonts at runtime and is not installed on the
// machine rendering this, so a <text> element would silently come out in
// whatever the renderer fell back to. The lockup is already outlined, so the
// wordmark is art rather than type and cannot fall back to anything.

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockup = join(root, 'node_modules/lingo-ds/assets/logo/stack-light.svg');
const outDir = join(root, 'public');
mkdirSync(outDir, { recursive: true });

/**
 * Open Graph's expected ratio, which is also a good shape for a README hero.
 * Nothing points an og:image at it yet — index.html would need the meta tags —
 * but sizing it this way now means wiring that up later is one line.
 */
const W = 1200;
const H = 630;

// --ink-1000 and --violet-500, read off the tokens rather than picked by eye.
const INK = '#0E0E15';
const VIOLET = '#6A4CF0';

/**
 * How wide the lockup sits on the card.
 *
 * The stack is tall — 146 wide to 209 high — so width is the wrong instinct to
 * size it by: 380 across came out 544 high, 86% of the card, and read as a logo
 * that had been cropped rather than placed. 232 lands it at about half the
 * height, which leaves the ground room to be a ground.
 */
const LOCKUP_W = 232;

/**
 * The ground: ink, with the brand glowing up behind where the lockup sits.
 *
 * A flat ink rectangle photographs as a black box in a feed. The glow is the
 * same violet the app uses, at a low enough opacity to stay a suggestion.
 */
const ground = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="44%" r="72%">
      <stop offset="0%" stop-color="${VIOLET}" stop-opacity="0.46" />
      <stop offset="28%" stop-color="${VIOLET}" stop-opacity="0.26" />
      <stop offset="58%" stop-color="${VIOLET}" stop-opacity="0.09" />
      <stop offset="100%" stop-color="${VIOLET}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK}" />
  <rect width="${W}" height="${H}" fill="url(#glow)" />
</svg>`);

const art = await sharp(lockup, { density: 384 })
  .resize({ width: LOCKUP_W })
  .png()
  .toBuffer();

await sharp(ground)
  .composite([{ input: art, gravity: 'centre' }])
  .png()
  .toFile(join(outDir, 'social-card.png'));

console.log(`wrote public/social-card.png — ${W}x${H}`);
