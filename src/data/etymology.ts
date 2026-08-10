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
  /**
   * Wikipedia article titles for those codes, where one was verified to exist.
   *
   * Sparse on purpose. Building the URL from the language name at render time
   * is the obvious approach and it is wrong: a fifth of all ancestor rows would
   * point at a disambiguation page, because "French", "English" and sixty other
   * language names are pages about everything with that name. The titles here
   * were each checked offline; a code with no entry gets no link.
   */
  wiki?: Record<string, string>;
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

/** A language's Wikipedia opening: `d` the one-line gloss, `e` the lead paragraph. */
export interface LanguageInfo { d?: string; e: string }

/**
 * The language descriptions, fetched once and kept for the session.
 *
 * Its own file rather than part of a shard, and loaded only when someone first
 * opens a language — the same reasoning as the shards themselves. It is shared
 * across workspaces because Latin is Latin whichever one you are studying.
 *
 * Baked rather than fetched from Wikipedia live: the app is installable, and a
 * panel that needs the network is empty exactly when someone is studying on a
 * plane. It also keeps a record of which languages a reader is curious about
 * from leaving the device.
 */
let languageInfo: Promise<Record<string, LanguageInfo>> | null = null;

export function loadLanguageInfo(): Promise<Record<string, LanguageInfo>> {
  languageInfo ??= fetch(`${import.meta.env.BASE_URL}etymology/languages.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, LanguageInfo>>) : {}))
    .catch(() => { languageInfo = null; return {}; });
  return languageInfo;
}

/** Wikipedia article for a language code, or null where none was verified. */
export const langLink = (data: Etymologies, code: string) => {
  const title = data.wiki?.[code];
  return title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` : null;
};

/** The article title itself, which is not always the language's name. */
export const langArticle = (data: Etymologies, code: string) => data.wiki?.[code] ?? null;

/**
 * Is the article filed under a name the reader would not recognise as this one?
 *
 * 143 of the 551 linked codes are, covering 8.7% of ancestor rows. Most are
 * harmless — Wikipedia files New Latin under "Neo-Latin" and Papiamentu under
 * "Papiamento" — but some genuinely change the subject: Proto-West Germanic
 * redirects to "West Germanic languages", which is the modern family and not
 * the reconstructed ancestor the chain means.
 *
 * Rather than adjudicate 143 cases of linguistics, the panel says where the
 * text came from whenever the names differ and lets the reader judge. Trailing
 * "language"/"languages" is ignored, since that suffix is how the disambiguated
 * titles were found in the first place and carries no new information.
 */
export const articleDiffers = (name: string, article: string | null) => {
  if (!article) return false;
  const norm = (s: string) => s.toLowerCase().replace(/\s+languages?$/, '').trim();
  return norm(article) !== norm(name);
};

/**
 * Words that list this one as a component — the tree run backwards.
 *
 * Built once per shard on first use rather than baked into the JSON, because
 * it is derivable from data already in memory and storing it would grow the
 * download for something a session may never open. One pass over 45,000
 * entries, then it is free.
 *
 * Affixes are skipped on both sides. `-er` is a component of 571 Dutch words
 * and `-ing` of 284, which is a fact about Dutch morphology rather than
 * anything to read: standing on a suffix, "words built from this" is the
 * dictionary. Standing on `boek` it is woordenboek, dagboek, boekwinkel —
 * which is the vocabulary the compound opens up.
 */
const isAffix = (word: string) => word.startsWith('-') || word.endsWith('-');

const descendantIndex = new WeakMap<Etymologies, Record<string, string[]>>();

export function descendants(data: Etymologies, word: string): string[] {
  let index = descendantIndex.get(data);
  if (!index) {
    index = {};
    for (const [child, chain] of Object.entries(data.words)) {
      if (isAffix(child)) continue;
      for (const part of chain.p ?? []) {
        if (isAffix(part) || part === child) continue;
        (index[part] ??= []).push(child);
      }
    }
    for (const list of Object.values(index)) list.sort((a, b) => a.length - b.length || a.localeCompare(b));
    descendantIndex.set(data, index);
  }
  return isAffix(word) ? [] : (index[word] ?? []);
}

/** Does this chain have anything worth showing? */
export const hasContent = (c: Chain | null): c is Chain =>
  !!c && !!((c.a?.length ?? 0) || (c.p?.length ?? 0) || (c.d?.length ?? 0));
