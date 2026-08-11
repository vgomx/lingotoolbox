// Builds the verb tables the Conjugation Drill reads.
//
//   npm run build:conjugation            # all three workspaces
//   npm run build:conjugation -- Dutch   # just one
//
// Output is committed, like the etymology shards, so a normal build never
// touches the network.
//
// TWO SOURCES, because neither has both halves:
//
//   kaikki has the conjugation tables but no idea which verbs matter. Its verb
//   list runs to thousands of lemmas, most of which no learner will meet.
//
//   hermitdave/FrequencyWords has counts from OpenSubtitles but no grammar: it
//   is a flat list of word forms, so `es` and `está` and `fueron` are three
//   unrelated rows and `ser` — the lemma they all belong to — barely appears.
//
// So the frequency of every inflected form is summed back onto its lemma
// through kaikki's own tables. That is what makes `ser` the top Spanish verb
// rather than the 400th: nobody says the infinitive much, and everybody uses
// the verb constantly.

import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/conjugation');

const LANGUAGES = [
  { code: 'NL', kaikki: 'Dutch', freq: 'nl' },
  { code: 'ES', kaikki: 'Spanish', freq: 'es' },
  { code: 'PT', kaikki: 'Portuguese', freq: 'pt' },
];

/** How many verbs to ship. Past this the tail is verbs a learner will not meet. */
const KEEP = 250;

const dumpUrl = (n) => `https://kaikki.org/dictionary/${n}/kaikki.org-dictionary-${n}.jsonl`;
const freqUrl = (l) => `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${l}/${l}_50k.txt`;

/*
 * Rows that are not forms, and forms nobody is drilled on.
 *
 * `table-tags` and `inflection-template` are Wiktionary's own bookkeeping,
 * arriving in the same array as the words — "no-table-tags" and "es-conj" are
 * not Spanish. `combined-form` is the clitic pile-up, dámelo and entregándoselas,
 * which is a different skill and three times the size of the rest of the table.
 * The remainder are forms that exist but are not what anyone is learning.
 */
const DROP = new Set([
  'table-tags', 'inflection-template', 'combined-form',
  'archaic', 'obsolete', 'dated', 'rare', 'majestic', 'colloquial', 'dialectal',
  'Flanders', 'Netherlands', 'Brazil', 'Portugal', 'Latin-America',
  'error-unknown-tag', 'multiword-construction',
]);

const PERSON = { 'first-person': '1', 'second-person': '2', 'third-person': '3' };
const NUMBER = { singular: 'sg', plural: 'pl' };
const MOOD = { indicative: 'ind', subjunctive: 'sub', imperative: 'imp', conditional: 'cond' };
const TENSE = {
  present: 'pres', past: 'past', preterite: 'pret', imperfect: 'imperf',
  future: 'fut', pluperfect: 'plup',
};

/**
 * A form's cell in the table — "ind.pres.1.sg" — or null if it is not one.
 *
 * A cell needs a person and a number to be drillable: "what is the first person
 * singular" is a question, "what is the gerund" is a different tool. Mood
 * defaults to indicative because Wiktionary omits the tag on the commonest
 * table and only names the marked ones.
 */
function cellKey(tags) {
  if (tags.some((t) => DROP.has(t))) return null;
  const person = tags.map((t) => PERSON[t]).find(Boolean);
  const number = tags.map((t) => NUMBER[t]).find(Boolean);
  // A number is required; a person is not. Dutch gives one plural form for wij,
  // jullie and zij alike, and dropping those left a table of singulars only.
  if (!number) return null;
  const mood = tags.map((t) => MOOD[t]).find(Boolean) ?? 'ind';
  const tense = tags.map((t) => TENSE[t]).find(Boolean);
  // The personal infinitive is Portuguese-specific and a mood of its own; an
  // untensed personal form otherwise is not something to drill.
  const who = person ? `${person}.${number}` : number;
  if (!tense) return tags.includes('infinitive') ? `pinf.${who}` : null;
  return `${mood}.${tense}.${who}`;
}

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
const targets = only.length ? LANGUAGES.filter((l) => only.includes(l.kaikki) || only.includes(l.code)) : LANGUAGES;
mkdirSync(outDir, { recursive: true });

for (const lang of targets) {
  process.stdout.write(`${lang.kaikki}: frequency list… `);
  const freq = new Map();
  const text = await fetch(freqUrl(lang.freq)).then((r) => r.text());
  for (const row of text.split('\n')) {
    const [word, n] = row.split(' ');
    if (word && n) freq.set(word.toLowerCase(), Number(n) || 0);
  }
  process.stdout.write(`${freq.size.toLocaleString()} words · streaming dump`);

  /** lemma → { cells, score } */
  const verbs = new Map();
  /*
   * Words that are also something other than a verb.
   *
   * Summing a verb's forms over the corpus counts homographs, and in Dutch that
   * is not a rounding error: `nieten` owns the form `niet`, `innen` owns `in`
   * and `maren` owns `maar` — three of the commonest words in the language and
   * none of them verbs. Unfiltered they made those the top three verbs in the
   * country. A form that is also a noun, an adverb or a preposition contributes
   * nothing to its verb's score, which undercounts real verbs like `werken`
   * slightly and is much the safer direction to be wrong in.
   */
  const nonVerb = new Set();
  let seen = 0;

  for await (const line of lines(dumpUrl(lang.kaikki))) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    seen += 1;
    if (seen % 200000 === 0) process.stdout.write(` ${(seen / 1000) | 0}k`);
    if (!entry.word) continue;
    if (entry.pos !== 'verb') { nonVerb.add(entry.word.toLowerCase()); continue; }

    const forms = entry.forms ?? [];
    // A lemma is an entry carrying its own table, not a cell in someone else's.
    if (!forms.some((f) => (f.tags ?? []).includes('infinitive'))) continue;

    const cells = {};
    // Every form of the verb, for scoring — including the ones not drillable.
    const surface = new Set([entry.word.toLowerCase()]);
    for (const f of forms) {
      const word = (f.form ?? '').trim();
      const tags = f.tags ?? [];
      if (!word || word === '-' || !tags.length) continue;
      if (!tags.some((t) => DROP.has(t))) surface.add(word.toLowerCase());
      const key = cellKey(tags);
      if (!key) continue;
      // First spelling wins; Wiktionary lists the standard form before its
      // formal and regional variants, which DROP has already thinned.
      if (!cells[key]) cells[key] = word;
    }

    if (Object.keys(cells).length < 6) continue;
    const existing = verbs.get(entry.word);
    if (!existing || Object.keys(cells).length > Object.keys(existing.cells).length) {
      verbs.set(entry.word, { cells, surface, gloss: entry.senses?.find((s) => s.glosses?.length)?.glosses?.[0] });
    }
  }
  process.stdout.write('\n');

  /*
   * Scored after the stream, not during it.
   *
   * `nonVerb` is only complete once every entry has been read, and scoring a
   * verb as it arrives would let whichever of `niet` the adverb and `nieten`
   * the verb happened to come first decide whether the homograph was caught.
   * The dump is roughly alphabetical, so it mostly worked — which is exactly
   * the kind of mostly that fails on a rebuild against a newer dump.
   */
  /*
   * A form claimed by several verbs splits its count between them.
   *
   * The non-verb filter above does not help when both claimants are verbs:
   * `podar` (to prune) shares poda, podas and podem with `poder`, and rode the
   * back of one of the commonest verbs in Portuguese into eighth place. Split
   * evenly, the forms `podar` owns alone are all that distinguish it, and it
   * falls back to where a verb about pruning belongs.
   */
  const claimants = new Map();
  for (const v of verbs.values()) for (const w of v.surface) claimants.set(w, (claimants.get(w) ?? 0) + 1);
  for (const v of verbs.values()) {
    v.score = [...v.surface].reduce((sum, w) => (
      nonVerb.has(w) ? sum : sum + (freq.get(w) ?? 0) / (claimants.get(w) ?? 1)
    ), 0);
  }

  const ranked = [...verbs.entries()]
    .filter(([, v]) => v.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, KEEP);

  /*
   * The table every shipped verb is measured against.
   *
   * Wiktionary fills different cells for different verbs, so taking each verb's
   * own set would give a drill whose questions changed shape from one verb to
   * the next. The cells kept are the ones most of the chosen verbs actually
   * have, which is a property of the language rather than of any one entry.
   */
  const cellCount = new Map();
  for (const [, v] of ranked) for (const k of Object.keys(v.cells)) cellCount.set(k, (cellCount.get(k) ?? 0) + 1);
  /*
   * Ordered as a conjugation table is read, not by how many verbs had each
   * cell. The drill shows these to a learner, and "third person plural
   * imperfect" arriving between two present-tense cells is a table nobody
   * recognises.
   */
  const ORDER = { mood: ['ind', 'sub', 'imp', 'cond', 'pinf'], tense: ['pres', 'past', 'pret', 'imperf', 'plup', 'fut'], who: ['1.sg', '2.sg', '3.sg', 'sg', '1.pl', '2.pl', '3.pl', 'pl'] };
  const rank = (key) => {
    const parts = key.split('.');
    const mood = parts[0];
    const tense = parts.length > 2 ? parts[1] : '';
    const who = parts.slice(tense ? 2 : 1).join('.');
    const at = (list, v) => { const i = list.indexOf(v); return i < 0 ? list.length : i; };
    return at(ORDER.mood, mood) * 10000 + at(ORDER.tense, tense) * 100 + at(ORDER.who, who);
  };
  const common = [...cellCount.entries()]
    .filter(([, n]) => n >= ranked.length * 0.8)
    .map(([k]) => k)
    .sort((a, b) => rank(a) - rank(b));

  const words = {};
  for (const [word, v] of ranked) {
    const cells = {};
    for (const k of common) if (v.cells[k]) cells[k] = v.cells[k];
    words[word] = { c: cells, g: v.gloss ? v.gloss.slice(0, 60) : undefined };
  }

  const payload = { language: lang.kaikki, cells: common, words };
  const json = JSON.stringify(payload);
  writeFileSync(join(outDir, `${lang.code}.json`), json);

  const kb = Buffer.byteLength(json) / 1024;
  const gz = gzipSync(Buffer.from(json), { level: 9 }).length / 1024;
  console.log(`  ${lang.code}: ${ranked.length} verbs · ${common.length} cells each · `
    + `${kb.toFixed(0)} KB raw, ${gz.toFixed(0)} KB gzipped`);
  console.log(`  cells: ${common.join(' ')}`);
  console.log(`  top ten: ${ranked.slice(0, 10).map(([w]) => w).join(', ')}`);
}
