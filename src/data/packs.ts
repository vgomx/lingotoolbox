import type { LanguageCode } from './types';

/**
 * The catalogue: grammar themes you can add to a workspace.
 *
 * A pack is a rule, the words that exercise it, and the verbs to drill it on.
 * Not a deck with a nicer name — a deck is a list of words, and a list of words
 * does not tell you where the prefix goes in a separable verb or why everything
 * is -inho. The note is what makes it a grammar pack; the cards are what make
 * it practice.
 *
 * It is a view over content that already exists rather than a second copy of
 * it. `deck` and `notes` are ids into SEED and SEED_NOTES, so a pack cannot
 * drift from the material it offers, and adding one months later builds the
 * same records the first install did — see buildDeck.
 *
 * `verbs` is a focus list, not data. The drill already loads every verb the
 * language has: NL, ES and PT ship whole conjugation tables, thousands of
 * words, and it picks from all of them. What a pack contributes is *which* of
 * them this theme is about, so drilling a pack asks about its own verbs
 * instead of the language's entire vocabulary.
 */
export interface Pack {
  id: string;
  language: LanguageCode;
  /** The theme, as a learner would name it. */
  name: string;
  /** One sentence: what the rule is, not what the pack contains. */
  blurb: string;
  /** The seeded deck this installs. */
  deck: string;
  /** Grammar notes it installs alongside. Ids into SEED_NOTES. */
  notes: string[];
  /** Lemmas the drill should favour while this pack is installed. */
  verbs?: string[];
  /**
   * Offered first in its language, and the one a fresh install arrives with.
   *
   * Exactly one per language. It is the phrase pack rather than the most
   * interesting grammar, because the first thing a workspace needs is
   * something to say, not a rule about how to say it.
   */
  starter?: boolean;
}

/**
 * The catalogue itself.
 *
 * Ordered as a course would be: what to say, then the rules that keep tripping
 * people up, then the ones you only meet once you are reading. Every pack has
 * a note except where the language genuinely has no rule to state — a list of
 * false friends is a warning, not a grammar.
 */
export const PACKS: Pack[] = [
  /* ── Dutch ─────────────────────────────────────────────────────────────── */
  {
    id: 'nl-starter', language: 'NL', name: 'Everyday phrases', starter: true,
    blurb: 'The sentences a day actually needs, and the rule that the verb comes second.',
    deck: 'nl-everyday', notes: ['nl-word-order'],
  },
  {
    id: 'nl-separable-pack', language: 'NL', name: 'Separable verbs',
    blurb: 'Verbs that come apart in a main clause and put themselves back together in a subordinate one.',
    deck: 'nl-separable', notes: ['nl-separable'],
    /* Checked against NL.json rather than written from memory: four of the
       eight this list started with — opbellen, uitgaan, meedoen, opruimen —
       are not in the table Wiktionary gave us, and a focus list naming verbs
       the drill cannot ask about is a pack that quietly does nothing. */
    verbs: ['meenemen', 'aankomen', 'afspreken', 'weggaan', 'terugkomen', 'opgeven', 'uitnodigen', 'ophouden'],
  },
  {
    id: 'nl-particles-pack', language: 'NL', name: 'Little words',
    blurb: 'toch, wel, even, hoor — the words that carry the tone and never translate.',
    deck: 'nl-particles', notes: ['nl-particles', 'nl-er'],
  },
  {
    id: 'nl-market-pack', language: 'NL', name: 'At the market',
    blurb: 'Food, quantities and asking for them — with the de/het problem the nouns bring with them.',
    deck: 'nl-market', notes: ['nl-de-het', 'nl-adjective-e'],
  },
  {
    id: 'nl-work-pack', language: 'NL', name: 'At work',
    blurb: 'Meetings, deadlines and the polite forms an office runs on.',
    deck: 'nl-work', notes: [],
  },

  /* ── Portuguese ────────────────────────────────────────────────────────── */
  {
    id: 'pt-starter', language: 'PT', name: 'Everyday phrases', starter: true,
    blurb: 'The sentences a day actually needs, and who você is talking to.',
    deck: 'pt-everyday', notes: ['pt-voce', 'pt-contractions'],
  },
  {
    id: 'pt-verbs-pack', language: 'PT', name: 'Everyday verbs',
    blurb: 'The verbs everything else is built from — including the two that both mean "to be".',
    deck: 'pt-verbs', notes: ['pt-ser-estar', 'pt-gerund'],
    verbs: ['ser', 'estar', 'ter', 'ir', 'fazer', 'poder', 'querer', 'dizer', 'ver', 'saber'],
  },
  {
    id: 'pt-cafe-pack', language: 'PT', name: 'At the café',
    blurb: 'Ordering, paying and the diminutive that turns a coffee into a cafezinho.',
    deck: 'pt-cafe', notes: ['pt-diminutive'],
  },
  {
    id: 'pt-false-friends-pack', language: 'PT', name: 'False friends',
    blurb: 'Words that look like English and mean something else entirely.',
    deck: 'pt-false-friends', notes: [],
  },
  {
    id: 'pt-feelings-pack', language: 'PT', name: 'How you feel',
    blurb: 'Saying how you are, and the por/para choice that keeps coming with it.',
    deck: 'pt-feelings', notes: ['pt-por-para'],
  },

  /* ── Spanish ───────────────────────────────────────────────────────────── */
  {
    id: 'es-starter', language: 'ES', name: 'Moods', starter: true,
    blurb: 'Saying how you are — and the two verbs that both mean "to be".',
    deck: 'es-feelings', notes: ['es-ser-estar'],
  },
  {
    id: 'es-verbs-pack', language: 'ES', name: 'Irregular verbs',
    blurb: 'The verbs that refuse the pattern, and the two past tenses they refuse it in.',
    deck: 'es-verbs', notes: ['es-preterito', 'es-subjunctive'],
    verbs: ['ser', 'estar', 'ir', 'tener', 'hacer', 'poder', 'querer', 'decir', 'venir', 'poner', 'saber', 'dar'],
  },
  {
    id: 'es-kitchen-pack', language: 'ES', name: 'Kitchen Spanish',
    blurb: 'Food and cooking, and the gender the nouns bring with them.',
    deck: 'es-kitchen', notes: ['es-gender'],
  },
  {
    id: 'es-travel-pack', language: 'ES', name: 'Getting around',
    blurb: 'Directions and transport, with the por/para choice that decides half of them.',
    deck: 'es-travel', notes: ['es-por-para', 'es-personal-a'],
  },
  {
    id: 'es-linking-pack', language: 'ES', name: 'Linking words',
    blurb: 'The joins that turn sentences into paragraphs.',
    deck: 'es-linking', notes: [],
  },
  {
    id: 'es-idioms-pack', language: 'ES', name: 'Idioms that lie',
    blurb: 'Phrases whose words tell you nothing about what they mean.',
    deck: 'es-idioms', notes: [],
  },

  /* ── English ───────────────────────────────────────────────────────────── */
  {
    id: 'en-starter', language: 'EN', name: 'Words worth knowing', starter: true,
    blurb: 'Precise words for things you already say the long way round.',
    deck: 'en-precise', notes: ['en-countable'],
  },
  {
    id: 'en-phrasal-pack', language: 'EN', name: 'Phrasal verbs',
    blurb: 'Verb plus particle, where the particle changes everything — and can be split.',
    deck: 'en-phrasal', notes: ['en-phrasal-split'],
  },
  {
    id: 'en-linking-pack', language: 'EN', name: 'Linking words',
    blurb: 'however, but, although — the joins, and which one takes which clause.',
    deck: 'en-linking', notes: ['en-however'],
  },
  {
    id: 'en-work-pack', language: 'EN', name: 'At work',
    blurb: 'Meetings and email, and the tense the updates are written in.',
    deck: 'en-work', notes: ['en-present-perfect'],
  },
  {
    id: 'en-directions-pack', language: 'EN', name: 'Getting around',
    blurb: 'Directions and transport, with the articles they keep needing.',
    deck: 'en-directions', notes: ['en-articles', 'en-adjective-order'],
  },
  {
    id: 'en-idioms-pack', language: 'EN', name: 'Everyday idioms',
    blurb: 'Phrases everyone uses and nobody explains.',
    deck: 'en-idioms', notes: [],
  },
];

export const packsFor = (language: LanguageCode) => PACKS.filter((p) => p.language === language);

export const starterFor = (language: LanguageCode) =>
  PACKS.find((p) => p.language === language && p.starter) ?? packsFor(language)[0];

export const packById = (id: string) => PACKS.find((p) => p.id === id);
