/**
 * Verifies every illustration the app references actually ships.
 *
 * A card stores a bare OpenMoji codepoint, so a typo — or trimming a glyph out of
 * scripts/openmoji-selection.mjs without checking who used it — produces a broken
 * image on a flashcard rather than a build error. Nothing else catches that:
 * TypeScript sees a `string`, and the file is fetched at runtime.
 *
 * Checks three things line up: the seed's codepoints, the generated catalogue,
 * and the SVG files on disk.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(path.join(root, p), 'utf8');

const catalogSrc = await read('src/data/openmojiCatalog.ts');
const catalog = JSON.parse(
  catalogSrc.match(/ILLUSTRATIONS[^=]*= (\[[\s\S]*\]);/)[1].replace(/,\n\]$/, '\n]'),
);
const byHex = new Map(catalog.map((i) => [i.hex, i]));

const onDisk = new Set(
  (await readdir(path.join(root, 'public', 'openmoji'))).filter((f) => f.endsWith('.svg')),
);

const problems = [];

// 1. Every catalogue entry has its file.
for (const entry of catalog) {
  if (!onDisk.has(entry.file)) {
    problems.push(`catalogue lists ${entry.file} (${entry.hex}) but public/openmoji/ has no such file`);
  }
}

// 2. Every file is in the catalogue — an orphan is dead weight in the deploy.
const listed = new Set(catalog.map((i) => i.file));
for (const file of onDisk) {
  if (!listed.has(file)) problems.push(`public/openmoji/${file} is not in the catalogue`);
}

// 3. Every codepoint the seed names resolves.
const seed = await read('src/data/seed.ts');
const used = [...seed.matchAll(/illustration:\s*'([^']+)'/g)].map((m) => m[1]);
for (const hex of new Set(used)) {
  if (!byHex.has(hex)) problems.push(`seed.ts references ${hex}, which is not in the vendored set`);
}

if (problems.length) {
  console.error(`Illustration check failed — ${problems.length} problem(s):`);
  problems.forEach((p) => console.error(`  ${p}`));
  console.error('\nRe-run `npm run build:illustrations` after editing scripts/openmoji-selection.mjs.');
  process.exit(1);
}

console.log(
  `Illustrations OK — ${catalog.length} glyphs vendored, ${new Set(used).size} used by the starter decks.`,
);
