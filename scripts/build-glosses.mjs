// Builds the meaning-per-word files the chain cards read.
//
//   npm run build:glosses            # all three workspaces
//   npm run build:glosses -- Dutch   # just one
//
// Output is committed, like the shards, so a normal build never touches the
// network. Re-run only alongside a newer Wiktionary dump.
//
// Separate from the shards rather than a field inside them, because it roughly
// doubles what a reader downloads: 640 KB gzipped against a Dutch shard that is
// 688. Split out, the shard still arrives at its old size and the meanings
// follow on their own, so a workspace that is only being browsed for ancestry
// never pays for them.
//
// Only words the shards already hold. There is no point shipping a meaning for
// a word the etymology tool cannot show.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/etymology');

const LANGUAGES = [
  { code: 'NL', kaikki: 'Dutch' },
  { code: 'ES', kaikki: 'Spanish' },
  { code: 'PT', kaikki: 'Portuguese' },
];

const dumpUrl = (name) => `https://kaikki.org/dictionary/${name}/kaikki.org-dictionary-${name}.jsonl`;

/**
 * Glosses that point at another word instead of saying what this one means.
 *
 * Wiktionary files every inflected form as its own entry, so the first gloss on
 * `raven` is "plural of raaf" and on `word` it is "inflection of worden". Taken
 * naively, one word in eight arrives as a grammar note rather than a meaning.
 * Measured on the Dutch dump: 13.3% of entries have nothing but a pointer, and
 * preferring a real meaning where the entry offers one leaves 11.4% of words
 * still pointing elsewhere — which is as good as this source gets.
 */
const POINTER = /^(inflection|plural|singular|alternative form|alternative spelling|obsolete form|archaic form|past participle|present participle|misspelling|diminutive|comparative|superlative|superlative degree|feminine|masculine|genitive|dative|accusative|attributive form|predicative form|gerund|imperative|infinitive|abbreviation|initialism|acronym|contraction|eye dialect|informal form|obsolete spelling|dated form|synonym|nonstandard form|rare form|dialectal form) of\b/i;

/**
 * Longest meaning worth printing under a headword.
 *
 * These are card subtitles, not dictionary entries. The median gloss is 21
 * characters and the 90th percentile is 56, so this cuts a long tail rather
 * than the common case — and it cuts at a word boundary so the result reads as
 * a shortened phrase rather than a severed one.
 */
const MAX = 80;

const trim = (g) => {
  const clean = g.replace(/\s+/g, ' ').trim().replace(/[:;,]$/, '');
  if (clean.length <= MAX) return clean;
  const cut = clean.slice(0, MAX);
  const space = cut.lastIndexOf(' ');
  return `${(space > MAX * 0.6 ? cut.slice(0, space) : cut).replace(/[.,;:]$/, '')}…`;
};

/** Reads a remote JSONL a line at a time, holding one line in memory. */
async function* lines(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line) yield line;
    }
  }
  if (buf) yield buf;
}

const only = process.argv.slice(2);
const wanted = only.length ? LANGUAGES.filter((l) => only.includes(l.kaikki) || only.includes(l.code)) : LANGUAGES;

for (const lang of wanted) {
  const shardPath = join(outDir, `${lang.code}.json`);
  if (!existsSync(shardPath)) {
    console.error(`No ${lang.code}.json — run \`npm run build:etymology\` first.`);
    continue;
  }
  const words = new Set(Object.keys(JSON.parse(readFileSync(shardPath, 'utf8')).words));
  console.log(`${lang.kaikki}: ${words.size.toLocaleString()} words to find a meaning for…`);

  const glosses = {};
  const pointerOnly = new Set();
  let seen = 0;

  for await (const line of lines(dumpUrl(lang.kaikki))) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const word = entry.word;
    if (!word || !words.has(word)) continue;
    seen += 1;

    const all = (entry.senses ?? []).flatMap((s) => s.glosses ?? []).filter(Boolean);
    if (!all.length) continue;

    const meaning = all.find((g) => !POINTER.test(g));
    if (meaning) {
      // A real meaning always wins, including over a pointer already stored
      // from an earlier entry for the same spelling.
      if (!glosses[word] || pointerOnly.has(word)) {
        glosses[word] = trim(meaning);
        pointerOnly.delete(word);
      }
    } else if (!glosses[word]) {
      glosses[word] = trim(all[0]);
      pointerOnly.add(word);
    }

    if (seen % 20000 === 0) process.stdout.write(`\r  ${Object.keys(glosses).length.toLocaleString()} found`);
  }
  process.stdout.write('\r');

  const file = join(outDir, `${lang.code}-glosses.json`);
  const json = JSON.stringify(glosses);
  writeFileSync(file, json);

  const found = Object.keys(glosses).length;
  const kb = Buffer.byteLength(json) / 1024;
  const gz = gzipSync(Buffer.from(json), { level: 9 }).length / 1024;
  console.log(`  ${lang.code}: ${found.toLocaleString()}/${words.size.toLocaleString()} words `
    + `(${(found / words.size * 100).toFixed(1)}%) · ${pointerOnly.size.toLocaleString()} are a pointer rather than a meaning · `
    + `${kb.toFixed(0)} KB raw, ${gz.toFixed(0)} KB gzipped`);
}
