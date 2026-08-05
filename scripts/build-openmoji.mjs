/**
 * Vendors the curated OpenMoji set into this repo.
 *
 *   node scripts/build-openmoji.mjs
 *
 * Writes public/openmoji/<slug>-<HEXCODE>.svg — the naming lingo-ds specifies so
 * a glyph can be traced back to its Unicode source — plus src/data/openmojiCatalog.ts,
 * the index the picker reads.
 *
 * The design system holds an 18-glyph sample as an example of the treatment and
 * says the full set is vendored in the product repo. This is that.
 *
 * Run by hand, not on every build: the output is committed, so an offline clone
 * and a deploy with no network both work. Re-run it after editing
 * openmoji-selection.mjs.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WHOLE_GROUPS, EXTRA } from './openmoji-selection.mjs';

const VERSION = '15.0.0';
const CDN = `https://cdn.jsdelivr.net/npm/openmoji@${VERSION}`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'openmoji');
const catalogFile = path.join(root, 'src', 'data', 'openmojiCatalog.ts');
// Kept out of public/: it is 2 MB and only the build needs it.
const cacheFile = path.join(root, 'node_modules', '.cache', 'openmoji.json');

/**
 * The picker's own grouping. OpenMoji's `smileys-emotion` covers both faces and
 * hearts, which are different things to go looking for, so it is split on the
 * subgroup. Everything else maps one to one.
 */
const GROUPS = [
  { id: 'expressions', label: 'Expressions' },
  { id: 'hearts', label: 'Hearts' },
  { id: 'gestures', label: 'Gestures' },
  { id: 'animals', label: 'Animals & nature' },
  { id: 'food', label: 'Food & drink' },
  { id: 'travel', label: 'Travel & places' },
  { id: 'objects', label: 'Objects' },
  { id: 'activities', label: 'Activities' },
  { id: 'symbols', label: 'Symbols' },
];

const GROUP_OF = {
  'people-body': 'gestures',
  'animals-nature': 'animals',
  'food-drink': 'food',
  'travel-places': 'travel',
  objects: 'objects',
  activities: 'activities',
  symbols: 'symbols',
};

function groupIdFor(entry) {
  if (entry.group === 'smileys-emotion') {
    return ['heart', 'emotion'].includes(entry.subgroups) ? 'hearts' : 'expressions';
  }
  return GROUP_OF[entry.group] ?? 'symbols';
}

/** Variation selectors and ZWJ are presentation, not identity — strip for matching. */
const bare = (s) => s.replace(/️|︎/g, '');

const slugify = (annotation) =>
  annotation.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function loadMetadata() {
  if (existsSync(cacheFile)) return JSON.parse(await readFile(cacheFile, 'utf8'));
  process.stdout.write('Downloading openmoji.json … ');
  const res = await fetch(`${CDN}/data/openmoji.json`);
  if (!res.ok) throw new Error(`openmoji.json → HTTP ${res.status}`);
  const json = await res.json();
  await mkdir(path.dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, JSON.stringify(json));
  console.log(`${json.length} glyphs`);
  return json;
}

const all = await loadMetadata();

// Skin-tone variants multiply the set six-fold and say nothing about the word on
// the card; the base glyph is what gets vendored.
const base = all.filter((e) => e.skintone === '');
const byEmoji = new Map();
for (const e of base) byEmoji.set(bare(e.emoji), e);

const picked = new Map();
for (const e of base) {
  if (WHOLE_GROUPS.includes(e.group)) picked.set(e.hexcode, e);
}
const wholeCount = picked.size;

const missing = [];
for (const char of EXTRA) {
  const entry = byEmoji.get(bare(char));
  if (!entry) { missing.push(char); continue; }
  picked.set(entry.hexcode, entry);
}

if (missing.length) {
  console.error(`\n${missing.length} selected glyph(s) not found in OpenMoji ${VERSION}:`);
  console.error(`  ${missing.join(' ')}`);
  console.error('Fix scripts/openmoji-selection.mjs — a typo here silently ships a smaller set.\n');
  process.exitCode = 1;
}

// CLDR order — the order every emoji keyboard already uses, so the picker feels
// like one rather than like our filing system.
const entries = [...picked.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

console.log(
  `Selected ${entries.length} glyphs — ${wholeCount} from ${WHOLE_GROUPS.join(', ')}, ` +
  `${entries.length - wholeCount} hand-picked.`,
);

// Rebuilt from scratch so a glyph dropped from the selection stops shipping.
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

let bytes = 0;
const failed = [];
const records = [];

/** Downloads run in small batches — jsDelivr is fine with it and 300 serial GETs are not. */
const BATCH = 12;
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH);
  await Promise.all(batch.map(async (e) => {
    const slug = slugify(e.annotation);
    const file = `${slug}-${e.hexcode}.svg`;
    const res = await fetch(`${CDN}/color/svg/${e.hexcode}.svg`);
    if (!res.ok) { failed.push(`${e.emoji} ${e.hexcode} → HTTP ${res.status}`); return; }
    const svg = await res.text();
    await writeFile(path.join(outDir, file), svg);
    bytes += Buffer.byteLength(svg);
    records.push({
      hex: e.hexcode,
      file,
      name: e.annotation,
      group: groupIdFor(e),
      // `tags` is what someone would type to find it; the annotation's own words
      // are already searchable, so only the extras are stored.
      keywords: [...new Set(
        `${e.tags},${e.openmoji_tags}`.split(',').map((t) => t.trim().toLowerCase())
          .filter((t) => t && !slug.includes(t.replace(/\s+/g, '-'))),
      )],
      order: e.order ?? 0,
    });
  }));
  process.stdout.write(`\r  ${Math.min(i + BATCH, entries.length)}/${entries.length}`);
}
console.log();

if (failed.length) {
  console.error(`\n${failed.length} download(s) failed:`);
  failed.forEach((f) => console.error(`  ${f}`));
  process.exitCode = 1;
}

records.sort((a, b) => a.order - b.order);

const licence = await (await fetch(`${CDN}/LICENSE.txt`)).text();
await writeFile(path.join(outDir, 'LICENSE.txt'), licence);

const usedGroups = GROUPS.filter((g) => records.some((r) => r.group === g.id));

const ts = `// Generated by scripts/build-openmoji.mjs — do not edit by hand.
// OpenMoji ${VERSION} (CC BY-SA 4.0). Re-run the script after editing
// scripts/openmoji-selection.mjs.
import type { Illustration, IllustrationGroup } from './types';

export const OPENMOJI_VERSION = '${VERSION}';

export const ILLUSTRATION_GROUPS: IllustrationGroup[] = ${JSON.stringify(
  usedGroups.map((g) => ({ id: g.id, label: g.label })), null, 2,
)};

export const ILLUSTRATIONS: Illustration[] = ${JSON.stringify(
  records.map(({ hex, file, name, group, keywords }) => ({ hex, file, name, group, keywords })),
  null, 0,
).replace(/\},\{/g, '},\n  {').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]')};
`;

await mkdir(path.dirname(catalogFile), { recursive: true });
await writeFile(catalogFile, ts);

const written = (await readdir(outDir)).filter((f) => f.endsWith('.svg')).length;
console.log(
  `Wrote ${written} SVG (${(bytes / 1024).toFixed(0)} KB) to public/openmoji/, ` +
  `LICENSE.txt, and src/data/openmojiCatalog.ts across ${usedGroups.length} groups.`,
);
