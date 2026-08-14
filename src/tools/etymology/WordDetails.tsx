import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Icon, IconButton, Tag } from 'lingo-ds';
import { useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import { EmptyTool } from '../EmptyTool';
import { WordTree } from './WordTree';
import { CognateTag } from './CognateTag';
import { LanguageProvider } from './languageContext';
import { descendants, glossFor, langName, loadEtymology, loadGlosses, lookup, hasContent, type Chain, type Etymologies } from '../../data/etymology';

const page: React.CSSProperties = {
  maxWidth: 780,
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
};

/*
 * The question sits above the card, not inside it.
 *
 * "Where it comes from" is what this screen is for, not a label on one box
 * among several — and as a card title it was set at the same size as "Words
 * built from this" and "Cognates" below, which made the main thing look like
 * the first of a list of equals. Out here it is a heading, at heading size,
 * and the card beneath it holds only the answer.
 */
const sectionHead: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 'var(--space-5)', marginBottom: 'var(--space-5)',
};

const sectionHeading: React.CSSProperties = {
  margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)',
  fontWeight: 800, color: 'var(--text-strong)',
};

/**
 * One word, opened out.
 *
 * Its own route rather than a panel, so it can be linked to, and so the back
 * button does what it looks like it does — you arrive here by clicking a word
 * and you leave by going back, which is the whole interaction.
 */
export function WordDetails() {
  const { word = '' } = useParams();
  const target = decodeURIComponent(word);
  const { language, workspace } = useStore();

  const [data, setData] = React.useState<Etymologies | null>(null);
  const [loading, setLoading] = React.useState(true);

  useChrome({
    title: target,
    titleIcon: 'git-branch',
    parent: { label: 'Etymology Explorer', to: '/app/etymology' },
  });

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    void loadEtymology(language).then((d) => {
      if (!live) return;
      setData(d); setLoading(false);
    });
    return () => { live = false; };
  }, [language]);

  const chain: Chain | null = data ? lookup(data, target) : null;

  /**
   * How many descendants to print. `huis` has 170 and `water` 145 — past a
   * few dozen this stops being a list you read and becomes a wall you scroll,
   * and the shortest are the ones worth having: they are the everyday
   * compounds rather than the six-part administrative nouns.
   */
  const SHOWN = 24;

  // The entry's own headword, which may differ from what was clicked — a card
  // reading "het brood" resolves to the entry for "brood", and the tree has to
  // be rooted at the key the data actually holds or nothing expands.
  const headword = React.useMemo(() => {
    if (!data || !chain) return target;
    const hit = Object.keys(data.words).find((k) => data.words[k] === chain);
    return hit ?? target;
  }, [data, chain, target]);

  /*
   * The word's meaning, loaded behind the chain rather than with it. The
   * ancestry is the point of the screen and does not wait on this; the caption
   * appears when it arrives.
   */
  const [glosses, setGlosses] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let live = true;
    void loadGlosses(language).then((g) => { if (live) setGlosses(g); });
    return () => { live = false; };
  }, [language]);

  const meaning = glossFor(glosses, headword) ?? glossFor(glosses, target);

  const built = React.useMemo(
    () => (data ? descendants(data, headword) : []),
    [data, headword],
  );

  if (loading) {
    return <div style={page}><p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-muted)' }}>Loading…</p></div>;
  }

  if (!hasContent(chain) || !data) {
    return (
      <div style={page}>
        <EmptyTool
          icon="search"
          accent="var(--tool-etymology)"
          title={`Nothing for “${target}”`}
          /*
           * This used to blame compounds and recent borrowings. Measured
           * against the dump, compounds are the best-covered thing here — 45%
           * of Dutch entries are kept *because* they name their parts. What is
           * actually absent is inflected forms, which have no etymology of
           * their own to record, and the advice that follows from that is
           * worth giving: try the base word.
           */
          description={`There is no ${workspace.name} entry for that word. Most gaps are inflected forms, which carry no origin of their own — the word they are built on usually does.`}
          action={(
            <Link to="/app/etymology" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" iconLeft={<Icon name="arrow-left" size={16} />}>Back to Etymology</Button>
            </Link>
          )}
        />
      </div>
    );
  }

  return (
    <LanguageProvider>
    <div style={page}>
      <div style={sectionHead}>
        <h2 style={sectionHeading}>Where it comes from</h2>
        {/*
          * Closes rather than goes back, and it is the only way out this screen
          * offers now.
          *
          * It navigates to the Explorer rather than calling history.back(), for
          * the same reason the crumb does: a word opened from a shared link, or
          * after a reload, has nothing behind it — and a close button that does
          * nothing is worse than no close button.
          */}
        <Link to="/app/etymology" style={{ textDecoration: 'none', flex: 'none', display: 'flex' }}>
          <IconButton label="Close">
            <Icon name="x" size={20} />
          </IconButton>
        </Link>
      </div>
      <Card>
        {/* The meaning goes to the tree rather than a subtitle up there: the
            heading asks where the word comes from, and a meaning hung under
            that reads as a subtitle of the question instead of an answer about
            the word. It belongs against the headword, which the tree draws. */}
        <WordTree word={headword} data={data} gloss={meaning} defaultOpen />
      </Card>

      {built.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Card
            title="Words built from this"
            subtitle={built.length > SHOWN
              ? `${built.length} in this workspace — the ${SHOWN} shortest first`
              : undefined}
          >
            {/* Links, unlike cognates: these are words in the language you are
                studying, so every one of them opens. This is the tree run
                backwards, and it is the part that pays off for a learner —
                boek is a word, boekwinkel and boekhandel and boekenkast are
                vocabulary you can now half-guess. */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {built.slice(0, SHOWN).map((d) => (
                <Link key={d} to={`/app/etymology/${encodeURIComponent(d)}`} style={{ textDecoration: 'none' }}>
                  <Tag color="var(--tool-etymology)">{d}</Tag>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {chain.d && chain.d.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Card title="Doublets">
            <p style={{ margin: 0, fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
              The same ancestor, arrived at twice by different routes — which is the most
              surprising thing etymology has to offer.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {chain.d.map((d) => (
                <Link key={d} to={`/app/etymology/${encodeURIComponent(d)}`} style={{ textDecoration: 'none' }}>
                  <Tag color="var(--tool-etymology)">{d}</Tag>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {chain.c && chain.c.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Card title="Cognates" subtitle="The same word, in languages that inherited it separately">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Not links: these are other languages, and this workspace holds
                  only its own. A cognate that looked clickable and was not
                  would be worse than one that plainly is not. */}
              {chain.c.map(([code, term], i) => (
                <CognateTag key={`${code}-${term}-${i}`} language={langName(data, code)} term={term} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <p style={{ margin: 'var(--space-8) 0 0', fontSize: 'var(--fs-12)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
        From{' '}
        <a href={`https://en.wiktionary.org/wiki/${encodeURIComponent(headword)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)' }}>
          the Wiktionary entry for {headword}
        </a>
        , CC BY-SA 4.0. Volunteer-written and not systematically verified — a surprising
        ancestry is a lead worth checking rather than a fact.
      </p>
    </div>
    </LanguageProvider>
  );
}
