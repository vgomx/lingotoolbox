// Generates the PWA icons from the design system's app-icon lockup.
//
// Committed as a script rather than as binaries dropped in by hand, so the icons
// can be traced back to the SVG they came from and regenerated when it changes:
//   npm run build:icons

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/lingo-ds/assets/logo/app-icon-violet.svg');
const outDir = join(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

/** The one brand fill, matching --brand. */
const VIOLET = '#6A4CF0';

/**
 * Android crops maskable icons to whatever shape the launcher uses, so the art
 * has to sit inside the safe zone with a full-bleed ground behind it. 62% keeps
 * the mark clear of a circular crop.
 */
const MASKABLE_SCALE = 0.62;

async function square(size) {
  return sharp(source, { density: 384 }).resize(size, size).png().toFile(join(outDir, `icon-${size}.png`));
}

async function maskable(size) {
  const inner = Math.round(size * MASKABLE_SCALE);
  const art = await sharp(source, { density: 384 }).resize(inner, inner).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: VIOLET },
  })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toFile(join(outDir, `icon-maskable-${size}.png`));
}

await Promise.all([square(192), square(512), maskable(512)]);
console.log('wrote public/icons/{icon-192,icon-512,icon-maskable-512}.png');
