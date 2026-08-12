// Builds the etymology shards the chain view reads.
//
//   npm run build:etymology            # all three workspaces
//   npm run build:etymology -- Dutch   # just one
//
// Output is committed, like the illustration set, so a normal build never
// touches the network and a clone with no connection still works. Re-run this
// only to pick up a newer Wiktionary dump.
//
// WHY THIS SOURCE, since the obvious one is wrong: etymology-db publishes the
// same information as an edge list, one row per relation. Following a chain
// there means joining across languages, so every extra step of depth costs a
// whole language's worth of rows — and measured that way, 99% of words dead-end
// after a single ancestor. kaikki denormalises the chain into each word's own
// record instead, which is why `venster` arrives already carrying Middle Dutch,
// Old Dutch and Latin. Half of Dutch words have two or more steps here against
// 0.8% in the edge list, and depth costs nothing extra because there is nothing
// to follow.
//
// The dumps are large — Dutch 236 MB, Portuguese 535 MB, Spanish 979 MB — so
// they are streamed and discarded a line at a time rather than downloaded.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/etymology');

/** Verified Wikipedia titles per language code — see resolve-language-links.mjs. */
const wikiCache = join(root, 'scripts/language-links.json');
const WIKI = existsSync(wikiCache) ? JSON.parse(readFileSync(wikiCache, 'utf8')) : {};

/** Workspace code → the name kaikki files that language under. */
const LANGUAGES = [
  { code: 'NL', kaikki: 'Dutch' },
  { code: 'ES', kaikki: 'Spanish' },
  { code: 'PT', kaikki: 'Portuguese' },
  // No English. English is the language these workspaces are glossed *into*,
  // and its dump is 3 GB — the screen says so rather than shipping it.
];

const CODES_URL = 'https://raw.githubusercontent.com/droher/etymology-db/master/wiktionary_codes.csv';
const dumpUrl = (name) => `https://kaikki.org/dictionary/${name}/kaikki.org-dictionary-${name}.jsonl`;

/**
 * Templates that say where a word came from: {1: own lang, 2: ancestor lang,
 * 3: ancestor term}. `root` reaches all the way back to a proto-form and takes
 * the same shape, so it rides along.
 */
const ANCESTRY = {
  inh: 'inherited', 'inh+': 'inherited', der: 'derived', bor: 'borrowed',
  'bor+': 'borrowed', ubor: 'borrowed', lbor: 'borrowed', slbor: 'borrowed',
  obor: 'borrowed', root: 'root', cal: 'calque', calque: 'calque', clq: 'calque',
  sl: 'semantic loan',
};

/** {1: the *cognate's* language, 2: term} — note that 1 is not the word's own. */
const COGNATE = new Set(['cog', 'cognate']);
/** {1: own lang, 2: the other term} — a sibling in the same language. */
const DOUBLET = new Set(['doublet', 'dbt']);

/**
 * {1: own lang, 2..n: the pieces} — how the word is put together.
 *
 * The short names matter more than they look. Wiktionary treats `{{com}}`,
 * `{{com+}}` and `{{compound+}}` as the same template as `{{compound}}` — the
 * + only changes how the sentence around it reads — and Dutch editors reach for
 * the short forms constantly. Recognising `suf` and `pre` but not `com` cost
 * 3,059 Dutch words, `afspraak` among them: it writes {{com|nl|af|spraak}},
 * while `doktersafspraak` and `belastingafspraak` spell {{compound}} out, so
 * the compounds were kept and the word they are both built on was dropped.
 *
 * `univerbation` (two words written as one), `confix` and `blend` name their
 * pieces the same way and belong here too.
 *
 * `surf` is deliberately absent. Surface analysis means the word was *not*
 * formed this way but can be read as if it were — printing "Built from" would
 * assert exactly what Wiktionary is being careful to avoid saying.
 */
const PARTS = new Set([
  'compound', 'compound+', 'com', 'com+', 'suffix', 'suf', 'prefix', 'pre',
  'affix', 'af', 'confix', 'univerbation', 'univ', 'blend',
]);

/**
 * {1: own lang, 2: the word it came from} — a derivation that stays put.
 *
 * These are steps like every other, except that both ends are in the same
 * language: `afspraak` is the noun of the verb `afspreken`, `dia` is what is
 * left of `diapositief`. The tool had nowhere to put them, so words whose whole
 * story was one of these were dropped.
 *
 * Being same-language is what makes them worth having: the ancestor is very
 * often a word this workspace already carries, so unlike a step to Latin it
 * leads somewhere.
 */
const DERIVATION = { deverbal: 'deverbal', clipping: 'clipping' };

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

const codesText = await fetch(CODES_URL).then((r) => r.text());
const CODE_NAME = new Map(
  codesText.split('\n').map((l) => l.split(',')).filter((p) => p.length >= 2)
    .map(([code, ...rest]) => [code.trim(), rest.join(',').trim()]),
);

/*
 * Codes the upstream list does not carry.
 *
 * Mostly language *families* rather than languages — Wiktionary will happily
 * say a word is "from Germanic" without committing to which one — plus a
 * couple of Latin periods and the substrate codes used when nobody knows where
 * a word came from at all. Without these the card printed `gem` at the reader,
 * which is worse than useless: it looks like a bug rather than like a family.
 */
const EXTRA_NAMES = {
  gem: 'Germanic', gmw: 'West Germanic', gmq: 'North Germanic', cel: 'Celtic',
  itc: 'Italic', sem: 'Semitic', trk: 'Turkic', ber: 'Berber', bnt: 'Bantu',
  nic: 'Niger-Congo', ira: 'Iranian', alg: 'Algonquian', 'ine-bsl': 'Balto-Slavic',
  'la-cla': 'Classical Latin', 'la-eme': 'Early Medieval Latin', 'la-lat': 'Late Latin',
  'nan-hbl': 'Hokkien', 'tpw-lga': 'Língua Geral Amazônica', fax: 'Fala',
  // Honest about not knowing, which is the actual scholarly position.
  'qfa-sub': 'an unidentified substrate', 'qsb-ibe': 'a pre-Roman Iberian substrate',
};
for (const [code, name] of Object.entries(EXTRA_NAMES)) {
  if (!CODE_NAME.has(code)) CODE_NAME.set(code, name);
}

/** Positional args only, in order: {1:…, 2:…, 3:…} → ['…','…','…']. */
const positional = (args = {}) => Object.keys(args)
  .filter((k) => /^\d+$/.test(k))
  .sort((a, b) => Number(a) - Number(b))
  .map((k) => args[k])
  .filter((v) => v && typeof v === 'string');

/**
 * An ancestor term with the template's markup taken off.
 *
 * Two kinds of debris. Qualifiers are deliberate — `ad-<id:to>` disambiguates
 * which sense of a Latin prefix is meant, and is not part of the word. Stray
 * angle brackets are not: `groene>>>` is simply how the argument arrives, and
 * a first pass that only removed matched `<…>` pairs left the arrows on screen.
 */
const cleanTerm = (s) => String(s ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/[<>]+/g, '')
  // A leading ^ is a Wiktionary display directive, not part of the word: the
  // Persian ancestor of Iran arrived as "^ایران".
  .replace(/^\^+/, '')
  .trim();

/**
 * A step out of an `ety` template, or null if it carries none.
 *
 * `ety` is the etymology-tree template, and it is how the Spanish and
 * Portuguese entries overwhelmingly write their origins — 45% and 57% more
 * words than the older templates alone reach. Dutch barely uses it: 37 entries
 * in the whole dump, of which 8 yield anything.
 *
 * Its shape is unlike the others. The relation is the second positional
 * argument with a colon on the front (`:inh`, `:ubor`), and the source is the
 * third as `langcode:term` rather than two arguments. `nl=1` marks an inflected
 * form whose entry says only "see the etymology of the corresponding lemma" —
 * true, and nothing this tool can draw, so those are left out.
 */
function etyStep(t) {
  const a = t.args ?? {};
  if (a.nl === '1' || a.nl === 1) return null;
  const rel = ANCESTRY[String(a['2'] ?? '').replace(/^:/, '')];
  const src = String(a['3'] ?? '');
  const at = src.indexOf(':');
  if (!rel || at < 1) return null;
  const code = src.slice(0, at).trim();
  const term = cleanTerm(src.slice(at + 1));
  return code && term ? [rel, code, term] : null;
}

function chainFor(entry) {
  const out = {};
  /**
   * Steps from `ety`, used only if the older templates yielded none.
   *
   * A fallback rather than an addition, because an entry carrying both names
   * the same ancestor twice in slightly different words and the dedup below
   * cannot see that they are the same: Iran arrived with `fa ایران` from one
   * and `fa-ira ایران` from the other, Canada with `en Canada` beside
   * `en,fr Canada`, epi- with two spellings of the same Greek prefix differing
   * by a diacritic. Preferring the older templates leaves every entry that
   * already worked exactly as it was, and this is only ever consulted for the
   * words that were being dropped entirely — which is what it was measured on.
   */
  const fallback = [];
  /** Same-language steps, held apart so they do not suppress the `ety` fallback. */
  const derivations = [];
  for (const t of entry.etymology_templates ?? []) {
    const name = t.name;
    const a = positional(t.args);
    if (name === 'ety') {
      const step = etyStep(t);
      if (step) fallback.push(step);
    } else if (DERIVATION[name]) {
      // [relation, the word's own language, the word it came from]
      if (a.length >= 2 && a[1]) derivations.push([DERIVATION[name], a[0], cleanTerm(a[1])]);
    } else if (ANCESTRY[name]) {
      // [relation, ancestor language code, ancestor term]
      if (a.length >= 3 && a[2]) (out.a ??= []).push([ANCESTRY[name], a[1], cleanTerm(a[2])]);
    } else if (COGNATE.has(name)) {
      // A cognate template may name several languages at once — {{cog|gl,es|…}}
      // — which arrived as the single code "gl,es" and matched nothing.
      if (a.length >= 2) for (const code of a[0].split(',')) {
        if (code.trim()) (out.c ??= []).push([code.trim(), a[1]]);
      }
    } else if (DOUBLET.has(name)) {
      if (a.length >= 2) (out.d ??= []).push(a[1]);
    } else if (PARTS.has(name)) {
      const parts = a.slice(1).filter(Boolean);
      if (parts.length >= 2) out.p = parts;
    }
  }
  if (!out.a && fallback.length) out.a = fallback;

  if (out.a) {
    /*
     * Two fixes the raw template order needs.
     *
     * Wiktionary often marks one step twice — {{inh|es|osp|agua}} beside
     * {{inh+|es|osp|agua}}, where the + only changes how the sentence reads —
     * so the same ancestor arrived twice in a row and `agua` appeared to pass
     * through Old Spanish on its way to Old Spanish.
     *
     * And a {{root}} sits at the top of the etymology section by convention,
     * which put Proto-Indo-European *bʰeh₂- above Old Spanish fablar in the
     * descent from hablar — the deepest ancestor listed as the first step. A
     * root is by definition where the line ends, so it goes last.
     */
    const seen = new Set();
    const deduped = out.a.filter(([, code, term]) => {
      const key = `${code}|${term}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const roots = deduped.filter(([rel]) => rel === 'root');
    out.a = [...deduped.filter(([rel]) => rel !== 'root'), ...roots];
  }

  /*
   * The same-language step goes on the front, after the ordering above.
   *
   * It is the nearest one — `afspraak` is the noun of `afspreken` first, and
   * whatever `afspreken` goes back to is a step further out — and prepending
   * after the root has been moved to the end leaves the root where it belongs.
   */
  if (derivations.length) out.a = [...derivations, ...(out.a ?? [])];

  // A word with only cognates is a curiosity, not an etymology. The chain view
  // needs at least one thing to say about where the word itself came from.
  if (!out.a && !out.p && !out.d) return null;
  return out;
}

const only = process.argv.slice(2);
const targets = only.length ? LANGUAGES.filter((l) => only.includes(l.kaikki)) : LANGUAGES;
mkdirSync(outDir, { recursive: true });

for (const lang of targets) {
  const words = {};
  const usedCodes = new Set();
  let seen = 0;
  process.stdout.write(`${lang.kaikki}: streaming…`);
  for await (const line of lines(dumpUrl(lang.kaikki))) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    seen += 1;
    if (seen % 200000 === 0) process.stdout.write(` ${(seen / 1000) | 0}k`);
    const word = entry.word;
    if (!word || words[word]) continue;
    const chain = chainFor(entry);
    if (!chain) continue;
    words[word] = chain;
    for (const [, code] of chain.a ?? []) usedCodes.add(code);
    for (const [code] of chain.c ?? []) usedCodes.add(code);
  }

  // Only the codes this shard actually mentions, so the client can print
  // "Middle Dutch" without shipping all 8,651 of them.
  const langs = {};
  for (const c of [...usedCodes].sort()) if (CODE_NAME.has(c)) langs[c] = CODE_NAME.get(c);

  // Wikipedia titles for the languages this shard names, resolved offline by
  // resolve-language-links.mjs. Missing cache is not an error: the shard is
  // still correct, the ancestors just render as plain text.
  const wiki = {};
  for (const c of Object.keys(langs)) if (WIKI[c]) wiki[c] = WIKI[c];

  const file = join(outDir, `${lang.code}.json`);
  const payload = { language: lang.kaikki, langs, wiki, words };
  writeFileSync(file, JSON.stringify(payload));
  const kb = Buffer.byteLength(JSON.stringify(payload)) / 1024;
  const deep = Object.values(words).filter((w) => (w.a?.length ?? 0) >= 2).length;
  console.log(`\n  ${lang.code}: ${Object.keys(words).length.toLocaleString()} words `
    + `(${deep.toLocaleString()} with 2+ steps) · ${Object.keys(langs).length} languages · ${(kb / 1024).toFixed(1)} MB`);
}
