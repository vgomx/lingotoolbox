import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon, IconButton, Input, useIsMobile } from 'lingo-ds';
import { useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import { EmptyTool } from '../EmptyTool';
import { ChainCard } from './ChainCard';
import { HAS_ETYMOLOGY, glossFor, hasContent, loadEtymology, loadGlosses, lookup, type Etymologies } from '../../data/etymology';

const page: React.CSSProperties = {
  maxWidth: 'var(--content-max, 1120px)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
};

/** How many suggestions to offer before the list stops being a suggestion. */
const MAX_HITS = 24;

/**
 * Where a word came from, for the workspace you are in.
 *
 * The data is a couple of megabytes per language, so it is fetched when this
 * screen opens rather than shipped with the app — most sessions are here to
 * review, not to read about Latin.
 */
export function EtymologyExplorer() {
  const { language, workspace, cards } = useStore();
  const isMobile = useIsMobile();

  const [data, setData] = React.useState<Etymologies | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [query, setQuery] = React.useState('');

  useChrome({ title: 'Etymology Explorer', titleIcon: 'git-branch' });

  React.useEffect(() => {
    let live = true;
    setState('loading'); setData(null); setQuery('');
    void loadEtymology(language).then((d) => {
      if (!live) return;
      setData(d);
      setState(d ? 'ready' : 'unavailable');
    });
    return () => { live = false; };
  }, [language]);

  /**
   * The dictionary's meaning for every word, behind the shard rather than in it.
   *
   * Its own request, so the chain is on screen before this arrives and the
   * subtitles appear when it does. Nothing waits for it and nothing breaks
   * without it — see loadGlosses for why it is not part of the shard.
   */
  const [glosses, setGlosses] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let live = true;
    void loadGlosses(language).then((g) => { if (live) setGlosses(g); });
    return () => { live = false; };
  }, [language]);

  /**
   * What the reader's own cards say each word means, which beats the dictionary.
   *
   * Built from every card rather than only the ones offered before you type, so
   * a word reached by searching still shows its own wording if it happens to be
   * on a card. Keyed lower-case because a card may read "De Kat" where the entry
   * is "de kat", and stripped of the article for the same reason `lookup` strips
   * it — "het brood" on the card, "brood" in the data.
   */
  const meanings = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cards) {
      const back = c.back.trim();
      if (!back) continue;
      const front = c.front.trim().toLowerCase();
      if (front) map.set(front, back);
      const bare = front.replace(/^(de|het|el|la|los|las|o|a|os|as)\s+/, '');
      if (bare && !map.has(bare)) map.set(bare, back);
    }
    return map;
  }, [cards]);

  /**
   * Your own cards first, before you have typed anything.
   *
   * An empty search box over 45,000 words is a worse starting point than it
   * looks — you have to already know what you want to look up. The words on
   * your cards are the ones you are actually trying to learn, so they are the
   * ones worth offering.
   */
  const fromYourCards = React.useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const out: { word: string; chain: NonNullable<ReturnType<typeof lookup>> }[] = [];
    for (const c of cards) {
      const word = c.front.trim();
      if (seen.has(word.toLowerCase())) continue;
      seen.add(word.toLowerCase());
      const chain = lookup(data, word);
      if (hasContent(chain)) out.push({ word, chain });
      if (out.length >= MAX_HITS) break;
    }
    return out;
  }, [data, cards]);

  const hits = React.useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const exact = lookup(data, q);
    const out: { word: string; chain: NonNullable<ReturnType<typeof lookup>> }[] = [];
    if (hasContent(exact)) out.push({ word: q, chain: exact });

    /*
     * Prefixes first, then anything containing the query.
     *
     * Prefix alone was wrong for these languages in particular: Dutch builds
     * words by gluing them together, so searching `appel` found nothing while
     * `aardappel`, `stroopwafel`-style compounds and every -boek in the list
     * sat there unmatched. Ranking still puts prefixes on top, because someone
     * typing `ver` almost certainly wants words starting that way rather than
     * the middle of `onoverwinnelijk`.
     */
    const seen = new Set<string>(out.map((o) => o.word.toLowerCase()));
    const inside: typeof out = [];
    for (const word of Object.keys(data.words)) {
      if (out.length >= MAX_HITS) break;
      const lower = word.toLowerCase();
      if (seen.has(lower)) continue;
      const at = lower.indexOf(q);
      if (at < 0) continue;
      const chain = data.words[word];
      if (!hasContent(chain)) continue;
      if (at === 0) { out.push({ word, chain }); seen.add(lower); }
      else if (inside.length < MAX_HITS) inside.push({ word, chain });
    }
    return [...out, ...inside].slice(0, MAX_HITS);
  }, [data, query]);

  if (state === 'unavailable') {
    return (
      <div style={page}>
        <EmptyTool
          icon="git-branch"
          accent="var(--tool-etymology)"
          title={`No ${workspace.name} etymologies`}
          description={
            HAS_ETYMOLOGY[language]
              ? 'The word list could not be loaded. Check your connection and try again.'
              : 'English is the language the other workspaces are explained in, so it has no word list of its own here. Switch to Dutch, Spanish or Portuguese to trace a word back.'
          }
          action={(
            <Link to="/app/cards" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" iconLeft={<Icon name="layers" size={16} />}>Open Flashcards</Button>
            </Link>
          )}
        />
      </div>
    );
  }

  const shown = query.trim() ? hits : fromYourCards;

  return (
    <div style={page}>
      <header style={{ marginBottom: 'var(--space-7)' }}>
        <span
          style={{
            fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}
        >
          {workspace.name}
          {data && ` · ${Object.keys(data.words).length.toLocaleString()} words`}
        </span>
        <h1
          style={{
            margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)',
            fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15,
          }}
        >
          Where the words came from
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)', maxWidth: 560, lineHeight: 'var(--lh-relaxed)' }}>
          Trace a word back through the languages it passed through. Knowing that
          <em> venster</em> is the same word as <em>fenestra</em> is often the thing that
          makes it stick.
        </p>

        {/* Full size, like the one on the Grammar screen: this is the way into
            45,000 words, not a filter tucked into a toolbar. */}
        <div style={{ marginTop: 'var(--space-6)', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Input
            placeholder={state === 'loading' ? 'Loading word list…' : 'Search a word…'}
            value={query}
            disabled={state === 'loading'}
            onChange={(e) => setQuery(e.target.value)}
            iconLeft={<Icon name="search" size={16} />}
            iconRight={query ? (
              <IconButton label="Clear search" size="sm" onClick={() => setQuery('')}>
                <Icon name="x" size={14} />
              </IconButton>
            ) : undefined}
          />
          {/* The list is capped, so "24" without "of" would read as the whole
              answer when it is the first page of it. */}
          {query.trim() && state === 'ready' && (
            <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>
              {hits.length === 0
                ? 'No matches'
                : hits.length >= MAX_HITS
                  ? `First ${MAX_HITS} matches`
                  : `${hits.length} ${hits.length === 1 ? 'match' : 'matches'}`}
            </span>
          )}
        </div>
      </header>

      {state === 'loading' ? (
        <p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>Loading…</p>
      ) : shown.length === 0 ? (
        <EmptyTool
          icon="search"
          accent="var(--tool-etymology)"
          title={query.trim() ? 'Nothing for that word' : 'Nothing from your cards yet'}
          description={
            query.trim()
              ? `No ${workspace.name} entry for “${query.trim()}”. Wiktionary does not have an etymology for every word — compounds and recent borrowings are often missing.`
              : 'None of the words on your cards has an entry yet. Search for one instead.'
          }
        />
      ) : (
        <>
          {!query.trim() && (
            <h2
              style={{
                margin: '0 0 var(--space-5)', fontSize: 'var(--fs-11)', fontWeight: 800,
                letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)',
              }}
            >
              From your cards
            </h2>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--space-6)', alignItems: 'start',
            }}
          >
            {/* The card is the way in: clicking a word opens it out, with each
                part of a compound expandable into its own descent. */}
            {shown.map(({ word, chain }) => (
              <Link
                key={word}
                to={`/app/etymology/${encodeURIComponent(word)}`}
                style={{ textDecoration: 'none', display: 'block', height: '100%' }}
              >
                <ChainCard
                  word={word}
                  chain={chain}
                  data={data!}
                  // The reader's own card wins over the dictionary: they wrote
                  // what the word means to them, and that is the wording they
                  // are learning it by.
                  gloss={meanings.get(word.trim().toLowerCase()) ?? glossFor(glosses, word)}
                  interactive
                />
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Required, not decorative: the data is CC BY-SA, so the credit travels
          with it. The accuracy note rides along in the same breath rather than
          as a second disclaimer nobody reads. */}
      {state === 'ready' && (
        <p style={{ margin: 'var(--space-8) 0 0', fontSize: 'var(--fs-12)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)', maxWidth: 620 }}>
          Etymologies from{' '}
          <a href="https://www.wiktionary.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)' }}>Wiktionary</a>,
          extracted with{' '}
          <a href="https://github.com/tatuylonen/wiktextract" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)' }}>wiktextract</a>,
          used under CC BY-SA 4.0. Wiktionary is written by volunteers and its etymologies are
          not all verified — treat a surprising one as a lead worth checking rather than a fact.
        </p>
      )}
    </div>
  );
}
