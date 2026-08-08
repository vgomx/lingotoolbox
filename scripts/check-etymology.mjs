// Guards the committed etymology shards. Runs on every build.
//
// None of this is visible to TypeScript: the shards are fetched at runtime, so
// a missing file, a truncated write or a language code with no name attached
// would all typecheck perfectly and then render "dum" at somebody instead of
// "Middle Dutch".

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public/etymology');

/** Must agree with HAS_ETYMOLOGY in src/data/etymology.ts. */
const EXPECTED = ['NL', 'ES', 'PT'];

const problems = [];
let totalWords = 0;
let totalBytes = 0;

for (const code of EXPECTED) {
  const file = join(dir, `${code}.json`);
  if (!existsSync(file)) {
    problems.push(`${code}.json is missing — run npm run build:etymology`);
    continue;
  }
  const raw = readFileSync(file);
  totalBytes += raw.length;

  let data;
  try {
    data = JSON.parse(raw.toString());
  } catch {
    problems.push(`${code}.json is not valid JSON — the build may have been interrupted`);
    continue;
  }

  const words = Object.keys(data.words ?? {});
  totalWords += words.length;
  if (words.length < 5000) problems.push(`${code}.json has only ${words.length} words, which suggests a partial stream`);

  /*
   * Language codes with no name to print.
   *
   * A tail here is unavoidable rather than a defect: Wiktionary mints codes for
   * substrates, families and reconstructed stages faster than any static list
   * tracks them, and the card falls back to showing the code. So this measures
   * the *rate* rather than demanding zero — a handful of exotic codes is the
   * normal state of the world, and a sudden 30% means the name map failed to
   * load and every reader is about to be shown `dum`.
   */
  let refs = 0;
  let unnamed = 0;
  const missing = new Set();
  for (const chain of Object.values(data.words ?? {})) {
    for (const [, lang] of chain.a ?? []) {
      refs += 1;
      if (!data.langs?.[lang]) { unnamed += 1; missing.add(lang); }
    }
    for (const [lang] of chain.c ?? []) {
      refs += 1;
      if (!data.langs?.[lang]) { unnamed += 1; missing.add(lang); }
    }
  }
  const rate = refs ? unnamed / refs : 0;
  if (rate > 0.01) {
    problems.push(`${code}.json cannot name ${(rate * 100).toFixed(1)}% of its language references `
      + `(${unnamed.toLocaleString()} of ${refs.toLocaleString()}) — the name map is probably broken. `
      + `Examples: ${[...missing].slice(0, 6).join(', ')}`);
  } else if (unnamed) {
    console.log(`  ${code}: ${unnamed} of ${refs.toLocaleString()} language references unnamed `
      + `(${(rate * 100).toFixed(2)}%), shown as their code — ${[...missing].slice(0, 4).join(', ')}`);
  }

  // The whole point of choosing this source was multi-step chains. If a rebuild
  // ever silently flattens them, that is worth failing over rather than
  // shipping a tool that shows one ancestor and calls itself an explorer.
  const deep = Object.values(data.words).filter((w) => (w.a?.length ?? 0) >= 2).length;
  if (deep < words.length * 0.05) {
    problems.push(`${code}.json has only ${deep} words with 2+ steps — the chain may have been flattened`);
  }
}

if (problems.length) {
  console.error('Etymology check failed:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

console.log(`Etymology OK — ${totalWords.toLocaleString()} words across ${EXPECTED.length} workspaces, `
  + `${(totalBytes / 1024 / 1024).toFixed(1)} MB, fetched on demand.`);
