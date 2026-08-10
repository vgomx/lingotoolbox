// Resolves each ancestor language to a Wikipedia article.
//
//   npm run build:language-links
//
// Output is committed to scripts/language-links.json and folded into the
// shards by build-etymology.mjs, so a normal build never touches the network.
// Re-run this only when new language codes appear in the data.
//
// WHY THIS IS NOT `https://en.wikipedia.org/wiki/${name}`, which is what it
// looks like it should be: for a fifth of all ancestor rows that lands on a
// disambiguation page. "French", "English", "Spanish", "German", "Dutch" and
// sixty other language names are pages about *everything* with that name —
// people, cuisine, football clubs — with the language one entry in a list.
// Measured against the shipped data, 20% of rows would have linked to one.
//
// So each name is probed twice, "<Name> language" first, and a page that comes
// back missing or flagged as a disambiguation is not a link. A language with no
// good target gets none: an ancestor that is plain text is honest, and a link
// promising an explanation and delivering a disambiguation list is not.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shardDir = join(root, 'public/etymology');
const cacheFile = join(root, 'scripts/language-links.json');

const API = 'https://en.wikipedia.org/w/api.php';
// Wikipedia asks for a real contact in the User-Agent and rate-limits requests
// without one. Anonymous batches got a plain "too many requests" back.
const UA = 'lingotoolbox-etymology/1.0 (https://github.com/vitorgomes/lingotoolbox)';
const BATCH = 40;          // the API caps `titles` at 50 per query
const PAUSE_MS = 1200;     // well inside the limit; this runs a few dozen times

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Asks Wikipedia what each title actually is.
 *
 * Redirects are followed, because "Latin language" redirects to "Latin" and
 * that is a fine article to land on. Disambiguation pages are found through
 * `pageprops`, which is the only way to tell one from a real article — they
 * are not missing, and they return perfectly ordinary titles.
 */
async function classify(titles) {
  const verdict = new Map();
  for (let i = 0; i < titles.length; i += BATCH) {
    const batch = titles.slice(i, i + BATCH);
    const url = `${API}?action=query&format=json&redirects=1&prop=pageprops`
      + `&titles=${batch.map(encodeURIComponent).join('|')}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Wikipedia returned ${res.status} ${res.statusText}`);
    const body = await res.json();

    // The API normalises and redirects titles, so what comes back is not what
    // was asked for. Walk the chain backwards to recover the original.
    const origin = new Map();
    for (const n of body.query.normalized ?? []) origin.set(n.to, n.from);
    for (const r of body.query.redirects ?? []) origin.set(r.to, origin.get(r.from) ?? r.from);

    for (const page of Object.values(body.query.pages)) {
      const asked = origin.get(page.title) ?? page.title;
      // null, not a sentinel string: a failure marker of the same type as a
      // success is a failure that reads as a success. The first version of
      // this returned 'missing', and `mul-tax` shipped a link to an article
      // called "missing".
      const ok = page.missing === undefined
        && !(page.pageprops && 'disambiguation' in page.pageprops);
      verdict.set(asked, ok ? page.title : null);
    }
    process.stdout.write(`\r  probed ${Math.min(i + BATCH, titles.length)}/${titles.length}`);
    if (i + BATCH < titles.length) await sleep(PAUSE_MS);
  }
  process.stdout.write('\n');
  return verdict;
}

/** Every language name the shards actually reference, with its code. */
function namesInShards() {
  const byCode = new Map();
  for (const file of ['NL.json', 'ES.json', 'PT.json']) {
    const path = join(shardDir, file);
    if (!existsSync(path)) continue;
    const { langs } = JSON.parse(readFileSync(path, 'utf8'));
    for (const [code, name] of Object.entries(langs)) byCode.set(code, name);
  }
  return byCode;
}

const byCode = namesInShards();
if (!byCode.size) {
  console.error('No shards in public/etymology — run `npm run build:etymology` first.');
  process.exit(1);
}

const names = [...new Set(byCode.values())];
console.log(`${byCode.size} language codes, ${names.length} distinct names.`);

// The bare name goes first because where it works it is the more precise
// article. Suffixing everything sent "Proto-West Germanic" to "West Germanic
// languages" — a real page, and the wrong one: that is the modern family, not
// the reconstructed ancestor the data means. The suffix is a rescue for the
// ambiguous names, not the preferred form.
console.log('Probing the bare name:');
const bare = await classify(names);
const leftover = names.filter((n) => !bare.get(n));
console.log(`Probing "<Name> language" for the ${leftover.length} that missed or disambiguated:`);
const suffixed = leftover.length ? await classify(leftover.map((n) => `${n} language`)) : new Map();

const links = {};
const unresolved = [];
for (const [code, name] of byCode) {
  const title = bare.get(name) ?? suffixed.get(`${name} language`) ?? null;
  if (title) links[code] = title; else unresolved.push(`${code} (${name})`);
}

writeFileSync(cacheFile, `${JSON.stringify(links, null, 2)}\n`);
console.log(`\n${Object.keys(links).length}/${byCode.size} codes linked → scripts/language-links.json`);

// Fold the result into the shards that are already on disk. build-etymology
// reads the same cache, but a full rebuild re-streams gigabytes of dumps to
// arrive at word data that has not changed — this is the same result without
// the download.
for (const file of ['NL.json', 'ES.json', 'PT.json']) {
  const path = join(shardDir, file);
  if (!existsSync(path)) continue;
  const shard = JSON.parse(readFileSync(path, 'utf8'));
  const wiki = {};
  for (const code of Object.keys(shard.langs)) if (links[code]) wiki[code] = links[code];
  // Key order matters only for the diff staying readable: wiki sits beside the
  // langs it annotates, and `words` — a couple of megabytes — stays last.
  const { language, langs, words } = shard;
  writeFileSync(path, JSON.stringify({ language, langs, wiki, words }));
  console.log(`  ${file}: ${Object.keys(wiki).length}/${Object.keys(langs).length} languages linked`);
}
if (unresolved.length) {
  console.log(`No article for ${unresolved.length}: ${unresolved.slice(0, 12).join(', ')}`
    + (unresolved.length > 12 ? ` … and ${unresolved.length - 12} more` : ''));
}
