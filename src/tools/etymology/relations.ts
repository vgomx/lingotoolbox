/** How each relation reads in a sentence, rather than as a database value. */
export const RELATION: Record<string, string> = {
  inherited: 'inherited from',
  derived: 'derived from',
  borrowed: 'borrowed from',
  calque: 'calqued on',
  'semantic loan': 'sense borrowed from',
  root: 'ultimately from the root',
};

/**
 * Did Wiktionary actually name a word here, or only a family?
 *
 * "Ultimately Semitic" with no Semitic word attached is written as a bare
 * hyphen. The claim is real; the placeholder is not something to print.
 */
export const isNamed = (term: string) => !['-', '—', '', '*', '?'].includes(term.trim());
