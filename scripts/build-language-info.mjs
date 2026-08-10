// Fetches the opening of each ancestor language's Wikipedia article.
//
//   npm run build:language-info
//
// Output is committed, like the shards and the link cache, so a normal build
// never touches the network. Re-run after resolve-language-links.mjs when new
// codes appear.
//
// WHY THIS IS BAKED RATHER THAN FETCHED WHEN THE PANEL OPENS, which would be
// less to carry: the app is installable and expected to work on a plane. A
// panel that needs the network to say anything is a panel that is empty
// exactly when someone is studying offline. It would also tell Wikipedia which
// languages a reader is curious about, one request per click, which is not a
// thing this app should be sending anywhere.
//
// It is its own file rather than part of the shards for the reason the shards
// are their own files: most sessions never open it. Loaded on first use and
// cached from then on.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const linksFile = join(root, 'scripts/language-links.json');
const outFile = join(root, 'public/etymology/languages.json');

const UA = 'lingotoolbox-etymology/1.0 (https://github.com/vitorgomes/lingotoolbox)';
const PAUSE_MS = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(linksFile)) {
  console.error('No scripts/language-links.json — run `npm run build:language-links` first.');
  process.exit(1);
}

const links = JSON.parse(readFileSync(linksFile, 'utf8'));
// Several codes share an article — Old Portuguese and Galician-Portuguese
// resolve to the same page — so fetch by title and map codes onto the result.
const titles = [...new Set(Object.values(links))];
console.log(`${Object.keys(links).length} codes across ${titles.length} distinct articles.`);

const byTitle = new Map();
let failed = 0;

for (const [i, title] of titles.entries()) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const body = await res.json();
      // `description` is the one-line gloss under the title; `extract` is the
      // lead paragraph. Both are plain text already — no markup to strip.
      if (body.extract) {
        byTitle.set(title, {
          d: body.description ?? undefined,
          e: body.extract,
        });
      } else failed += 1;
    } else failed += 1;
  } catch {
    failed += 1;
  }
  if ((i + 1) % 40 === 0 || i === titles.length - 1) {
    process.stdout.write(`\r  ${i + 1}/${titles.length} fetched`);
  }
  await sleep(PAUSE_MS);
}
process.stdout.write('\n');

const out = {};
for (const [code, title] of Object.entries(links)) {
  const hit = byTitle.get(title);
  if (hit) out[code] = hit;
}

writeFileSync(outFile, JSON.stringify(out));
const kb = Buffer.byteLength(JSON.stringify(out)) / 1024;
console.log(`${Object.keys(out).length}/${Object.keys(links).length} codes described`
  + `${failed ? ` · ${failed} articles had no extract` : ''} · ${kb.toFixed(0)} KB`);
