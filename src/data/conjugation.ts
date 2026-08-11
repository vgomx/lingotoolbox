import type { LanguageCode } from './types';

/**
 * The verb tables the drill asks from — see scripts/build-conjugation.mjs.
 *
 * `cells` is the table's shape, in the order a table is read; every word holds
 * the subset of those cells Wiktionary had for it. Keys look like
 * "ind.pres.1.sg": mood, tense, person, number, with the person omitted where
 * the language does not distinguish one (Dutch has a single plural).
 */
export interface VerbTable { c: Record<string, string>; g?: string }
export interface Conjugations {
  language: string;
  cells: string[];
  words: Record<string, VerbTable>;
}

/** Which workspaces have verb tables. English is the language they are glossed into. */
export const HAS_CONJUGATION: Record<LanguageCode, boolean> = {
  NL: true, ES: true, PT: true, EN: false,
};

const inFlight = new Map<LanguageCode, Promise<Conjugations | null>>();

export function loadConjugation(language: LanguageCode): Promise<Conjugations | null> {
  const cached = inFlight.get(language);
  if (cached) return cached;

  const p: Promise<Conjugations | null> = HAS_CONJUGATION[language]
    ? fetch(`${import.meta.env.BASE_URL}conjugation/${language}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Conjugations>) : null))
      .catch(() => { inFlight.delete(language); return null; })
    : Promise.resolve(null);

  inFlight.set(language, p);
  return p;
}

/* ── naming the cells ────────────────────────────────────────────────────── */

/**
 * The pronoun a learner would actually say, per language.
 *
 * The drill asks "ik ___" rather than "first person singular", because that is
 * how the form is reached when speaking — nobody conjugates by parsing the
 * label. Second person singular is the informal one: it is what these
 * workspaces teach, and the formal forms were filtered out of the tables.
 */
const PRONOUNS: Record<string, Record<string, string>> = {
  NL: { '1.sg': 'ik', '2.sg': 'jij', '3.sg': 'hij', sg: 'ik', '1.pl': 'wij', '2.pl': 'jullie', '3.pl': 'zij', pl: 'wij' },
  ES: { '1.sg': 'yo', '2.sg': 'tú', '3.sg': 'él', sg: 'yo', '1.pl': 'nosotros', '2.pl': 'vosotros', '3.pl': 'ellos', pl: 'nosotros' },
  PT: { '1.sg': 'eu', '2.sg': 'tu', '3.sg': 'ele', sg: 'eu', '1.pl': 'nós', '2.pl': 'vós', '3.pl': 'eles', pl: 'nós' },
};

const MOOD_NAME: Record<string, string> = {
  ind: '', sub: 'subjunctive', imp: 'imperative', cond: 'conditional', pinf: 'personal infinitive',
};

const TENSE_NAME: Record<string, string> = {
  pres: 'present', past: 'past', pret: 'preterite', imperf: 'imperfect',
  plup: 'pluperfect', fut: 'future',
};

export interface CellName { pronoun: string; tense: string; group: string }

/**
 * A cell as a prompt: who is speaking, and in what.
 *
 * `group` is the tense-and-mood without the person, which is what the drill
 * lets a reader choose between — Spanish ships 44 cells across eight of these,
 * and being asked the future subjunctive on the first day is how a tool
 * teaches somebody that it is not for them.
 */
export function cellName(language: LanguageCode, key: string): CellName {
  const parts = key.split('.');
  const mood = parts[0];
  const hasTense = parts.length > 2 && TENSE_NAME[parts[1]];
  const tense = hasTense ? parts[1] : '';
  const who = parts.slice(hasTense ? 2 : 1).join('.');

  const moodWord = MOOD_NAME[mood] ?? mood;
  const tenseWord = TENSE_NAME[tense] ?? '';
  const label = [tenseWord, moodWord].filter(Boolean).join(' ') || moodWord || tenseWord;

  return {
    pronoun: PRONOUNS[language]?.[who] ?? who,
    tense: label,
    group: `${mood}.${tense}`,
  };
}

/** The distinct tense-and-mood groups a table offers, in the table's own order. */
export function groupsOf(data: Conjugations, language: LanguageCode) {
  const seen = new Map<string, string>();
  for (const key of data.cells) {
    const { group, tense } = cellName(language, key);
    if (!seen.has(group)) seen.set(group, tense);
  }
  return [...seen].map(([id, label]) => ({ id, label }));
}

/* ── marking an answer ───────────────────────────────────────────────────── */

/** Case, spacing and accents removed, for comparing what was typed. */
const bare = (s: string) => s.trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ');

export type Verdict = 'right' | 'accents' | 'wrong';

/**
 * Marks a typed answer.
 *
 * Accents get their own verdict rather than being right or wrong. "Hable" for
 * *hablé* is not a failure of conjugation — the reader knew the form and missed
 * the diacritic — and marking it wrong teaches them they cannot do something
 * they can. It is not silently accepted either: in Spanish the accent is the
 * difference between "I speak" and "he spoke".
 */
export function mark(typed: string, expected: string): Verdict {
  const t = typed.trim().toLowerCase().replace(/\s+/g, ' ');
  const e = expected.trim().toLowerCase();
  if (t === e) return 'right';
  return bare(t) === bare(e) ? 'accents' : 'wrong';
}
