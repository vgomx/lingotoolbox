/** How each relation reads in a sentence, rather than as a database value. */
export const RELATION: Record<string, string> = {
  inherited: 'inherited from',
  derived: 'derived from',
  borrowed: 'borrowed from',
  calque: 'calqued on',
  'semantic loan': 'sense borrowed from',
  root: 'ultimately from the root',
  /*
   * Same-language steps, and the only ones written as complete phrases.
   *
   * The node reads word first and relation after — "af · inherited from ·
   * MIDDLE DUTCH" — so every other relation here ends on a preposition and
   * hands off to the language stamp. These have no stamp to hand off to, and
   * "diapositief · shortened from" trails away mid-sentence. Said whole, they
   * are captions on the word instead: "diapositief · the word it is short for".
   */
  deverbal: 'the verb it comes from',
  clipping: 'the word it is short for',
};

/**
 * Relations whose other end is in the same language as the word.
 *
 * `afspraak` comes from `afspreken`, which is Dutch, on a Dutch word, in the
 * Dutch workspace — stamping DUTCH on it would spend the loudest mark on the
 * page saying the only thing the reader already knows. The stamp exists to
 * mark the moment a word crosses a language; these steps never do.
 */
export const SAME_LANGUAGE = new Set(['deverbal', 'clipping']);

/**
 * Did Wiktionary actually name a word here, or only a family?
 *
 * "Ultimately Semitic" with no Semitic word attached is written as a bare
 * hyphen. The claim is real; the placeholder is not something to print.
 */
export const isNamed = (term: string) => !['-', '—', '', '*', '?'].includes(term.trim());
