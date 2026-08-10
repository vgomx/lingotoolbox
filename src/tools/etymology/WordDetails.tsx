import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Icon, Tag } from 'lingo-ds';
import { useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import { EmptyTool } from '../EmptyTool';
import { WordTree } from './WordTree';
import { CognateTag } from './CognateTag';
import { LanguageProvider } from './languageContext';
import { descendants, langName, loadEtymology, lookup, hasContent, type Chain, type Etymologies } from '../../data/etymology';

const page: React.CSSProperties = {
  maxWidth: 780,
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
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
          description={`There is no ${workspace.name} entry for that word. Wiktionary does not have an etymology for everything — compounds and recent borrowings are often missing.`}
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
      <Card title="Where it comes from">
        <WordTree word={headword} data={data} defaultOpen />
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
