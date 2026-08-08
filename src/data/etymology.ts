import type { LanguageCode } from './types';

/** One step back: how the word got there, from which language, as what. */
export type Step = [relation: string, langCode: string, term: string];
/** A cognate in a related language: the language, then the word. */
export type Cognate = [langCode: string, term: string];

export interface Chain {
  /** Ancestry, oldest last — the order Wiktionary tells the story in. */
  a?: Step[];
  c?: Cognate[];
  /** Doublets: a sibling in the same language, from the same source. */
  d?: string[];
  /** The pieces it is built from, for compounds and affixed words. */
  p?: string[];
}

export interface Etymologies {
  language: string;
  /** Only the language codes this shard mentions — `dum` → `Middle Dutch`. */
  langs: Record<string, string>;
  words: Record<string, Chain>;
}

/**
 * Which workspaces have a shard.
 *
 * English is missing on purpose rather than by omission: it is the language the
 * other three are glossed *into*, and its dump is 3 GB. The screen says so.
 */
export const HAS_ETYMOLOGY: Record<LanguageCode, boolean> = {
  NL: true, ES: true, PT: true, EN: false,
};

/**
 * Fetched on demand, once per language, and kept for the session.
 *
 * Deliberately not in the store and not precached. It is a build asset rather
 * than anything the reader owns, it is a couple of megabytes per language, and
 * most sessions never open this tool — so it stays off the critical path and
 * out of the service worker's precache. The promise itself is the cache, so two
 * callers arriving at once share one request rather than racing.
 */
const inFlight = new Map<LanguageCode, Promise<Etymologies | null>>();

export function loadEtymology(language: LanguageCode): Promise<Etymologies | null> {
  const cached = inFlight.get(language);
  if (cached) return cached;

  const p: Promise<Etymologies | null> = HAS_ETYMOLOGY[language]
    ? fetch(`${import.meta.env.BASE_URL}etymology/${language}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Etymologies>) : null))
      // A failed fetch must not poison the cache, or the tool stays broken for
      // the rest of the session over one dropped connection.
      .catch(() => { inFlight.delete(language); return null; })
    : Promise.resolve(null);

  inFlight.set(language, p);
  return p;
}

/**
 * Looks a word up the way someone would type it.
 *
 * Wiktionary heads its entries in lower case for everything but proper nouns,
 * while a card might carry "De Kat" or a trailing space from a paste. Falling
 * back through the obvious normalisations costs nothing and saves the reader
 * from having to know any of that.
 */
export function lookup(data: Etymologies, raw: string): Chain | null {
  const word = raw.trim();
  if (!word) return null;
  return data.words[word]
    ?? data.words[word.toLowerCase()]
    // Cards often carry the article — "het brood" — where the entry is "brood".
    ?? data.words[word.replace(/^(de|het|el|la|los|las|o|a|os|as)\s+/i, '')]
    ?? data.words[word.replace(/^(de|het|el|la|los|las|o|a|os|as)\s+/i, '').toLowerCase()]
    ?? null;
}

/** Human name for a language code, falling back to the code itself. */
export const langName = (data: Etymologies, code: string) => data.langs[code] ?? code;

/** Does this chain have anything worth showing? */
export const hasContent = (c: Chain | null): c is Chain =>
  !!c && !!((c.a?.length ?? 0) || (c.p?.length ?? 0) || (c.d?.length ?? 0));
