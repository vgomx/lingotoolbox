import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Icon, IconButton, ProgressBar, Tag, useIsMobile } from 'lingo-ds';
import { TopRight, useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import { levelRange } from '../../data/types';
import type { CEFRLevel } from '../../data/types';
import { LevelFilter } from './LevelFilter';
import { EmptyTool } from '../EmptyTool';
import { PackCatalogue } from './PackCatalogue';
import { packsFor } from '../../data/packs';
import { isDue } from '../../data/scheduler';

const page: React.CSSProperties = {
  maxWidth: 'var(--content-max, 1120px)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
};

export function DeckList() {
  const [catalogue, setCatalogue] = React.useState(false);
  const isMobile = useIsMobile();
  const { decks, cardsInDeck, dueCount, workspace, language, installed } = useStore();
  /* How many packs this workspace still has to offer. Both the button and the
     empty state are about this number, so it is worked out once. */
  const remaining = packsFor(language).filter((p) => !installed.has(p.id)).length;
  const navigate = useNavigate();

  const totalCards = decks.reduce((n, d) => n + cardsInDeck(d.id).length, 0);

  const [levels, setLevels] = React.useState<Set<CEFRLevel>>(new Set());

  /**
   * Every deck with the cards the filter leaves in it, and decks with none left
   * dropped.
   *
   * The filter is applied to the cards and the decks follow, rather than being
   * applied to the decks directly. Matching a deck on "has at least one B1 card"
   * would show a deck of forty against a filter one card satisfies, and the
   * count on it would still say forty.
   */
  const shown = React.useMemo(() => decks.map((deck) => {
    const all = cardsInDeck(deck.id);
    const cards = levels.size ? all.filter((c) => c.level && levels.has(c.level)) : all;
    // Counted over the filtered set rather than the deck, so the number and the
    // cards under it are talking about the same thing.
    return { deck, cards, total: all.length, due: cards.filter((c) => isDue(c)).length };
  }).filter((d) => d.cards.length > 0), [decks, cardsInDeck, levels]);

  /**
   * How many cards sit at each level across the workspace — for the counts on
   * the chips, so the filter says what it has before you press it.
   *
   * Counted over everything rather than over what is currently shown, so the
   * numbers do not move as you narrow and leave you unable to get back.
   */
  const counts = React.useMemo(() => {
    const out: Partial<Record<CEFRLevel, number>> = {};
    decks.forEach((d) => cardsInDeck(d.id).forEach((c) => {
      if (c.level) out[c.level] = (out[c.level] ?? 0) + 1;
    }));
    return out;
  }, [decks, cardsInDeck]);

  const graded = Object.values(counts).reduce((n, v) => n + (v ?? 0), 0);
  const filtering = levels.size > 0;
  const shownCards = shown.reduce((n, d) => n + d.cards.length, 0);

  useChrome({ title: 'Flashcards', titleIcon: 'layers', sidebar: true });

  return (
    <>
      {dueCount > 0 && (
        <TopRight>
          {isMobile ? (
            // Icon-only, as on the deck screen: the words cost ~90px of a 375px
            // bar that already carries the brand mark, the title and the language.
            <IconButton label={`Start a review of ${dueCount} cards`} size="lg" variant="brand" onClick={() => navigate('/app/review')}>
              <Icon name="play" size={18} />
            </IconButton>
          ) : (
            <Button
              size="sm"
              iconLeft={<Icon name="play" size={15} />}
              onClick={() => navigate('/app/review')}
            >
              Start review
            </Button>
          )}
        </TopRight>
      )}
      <div style={page}>
        <header style={{ marginBottom: 'var(--space-8)' }}>
          <span
            style={{
              fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)',
              textTransform: 'uppercase', color: 'var(--text-muted)',
            }}
          >
            {workspace.name} · {filtering
              ? `${shown.length} of ${decks.length} ${decks.length === 1 ? 'deck' : 'decks'} · ${shownCards} of ${totalCards} cards`
              : `${decks.length} ${decks.length === 1 ? 'deck' : 'decks'} · ${totalCards} cards`}
          </span>
          <h1
            style={{
              margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)',
              fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15,
            }}
          >
            {dueCount ? `${dueCount} due today` : 'Nothing due today'}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)', maxWidth: 520, lineHeight: 'var(--lh-relaxed)' }}>
            {dueCount
              ? 'Grade each card and the schedule adjusts. Sessions end when you are done.'
              : 'Every card is scheduled ahead. Add cards to a deck, or come back tomorrow.'}
          </p>
          {/* Only once something is graded. On a workspace of cards someone
              wrote themselves, every chip would be empty and the row would be a
              control that cannot do anything. */}
          {graded > 0 && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <LevelFilter value={levels} onChange={setLevels} counts={counts} />
            </div>
          )}

          {/* The way in to the catalogue, and only while there is something in
              it to add. A door to an empty room teaches you to stop opening
              it. */}
          {remaining > 0 && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <Button variant="secondary" onClick={() => setCatalogue(true)} iconLeft={<Icon name="circle-plus" size={16} />}>
                Add decks
              </Button>
            </div>
          )}
        </header>

        <PackCatalogue open={catalogue} onClose={() => setCatalogue(false)} />

        {decks.length === 0 ? (
          <EmptyTool
            icon="layers"
            accent="var(--tool-flashcards)"
            title="No decks yet"
            /* Both ways in, because the catalogue is a starting point rather
               than the only source of cards. Writing your own has always been
               the plus in the sidebar, and an empty state that only offered the
               catalogue made it look like the app's decks were the app's to
               give. */
            description={`Add one of the ${remaining} ready-made ${workspace.name} decks — a rule, the words that exercise it, and the verbs to drill it on — or write your own from the plus in the sidebar.`}
            action={
              <div style={{ display: 'flex', gap: 'var(--gap-inline)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button onClick={() => setCatalogue(true)} iconLeft={<Icon name="circle-plus" size={16} />}>
                  Browse decks
                </Button>
              </div>
            }
          />
        ) : (
          // A guard rather than a state you can reach: a chip with no cards
          // behind it is disabled, so every selectable one has at least one deck
          // to show. It is here so that stops being true loudly rather than as
          // an empty grid with nothing to say for itself.
          shown.length === 0 ? (
            <EmptyTool
              icon="layers"
              accent="var(--tool-flashcards)"
              title="Nothing at that level"
              description={`No ${workspace.name} card is marked ${[...levels].join(' or ')}. Cards you write yourself are ungraded until you set a level on them.`}
              action={<Button variant="secondary" onClick={() => setLevels(new Set())}>Clear the filter</Button>}
            />
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
            {shown.map(({ deck, cards, total, due }) => {
              const mastered = cards.filter((c) => c.state === 'review' && c.interval >= 21).length;
              const learning = cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length;
              const fresh = cards.filter((c) => c.state === 'new').length;

              return (
                <Link key={deck.id} to={`/app/cards/${deck.id}`} style={{ textDecoration: 'none' }}>
                  <Card
                    interactive
                    accent={deck.accent}
                    title={deck.name}
                    // "8 of 8" is a fraction that says nothing. Only worth
                    // spelling out when the filter actually left something out.
                    subtitle={cards.length === total
                      ? `${total} cards · ${due} due`
                      : `${cards.length} of ${total} cards · ${due} due`}
                    actions={due > 0 ? <Badge tone="danger">{due}</Badge> : undefined}
                    style={{ height: '100%' }}
                  >
                    <ProgressBar
                      label="Mastery"
                      valueLabel={cards.length ? `${Math.round((mastered / cards.length) * 100)}%` : '—'}
                      segments={cards.length ? [
                        { weight: mastered || 0.001, color: 'var(--success)' },
                        { weight: learning || 0.001, color: 'var(--warning)' },
                        { weight: fresh || 0.001, color: 'var(--surface-raised)' },
                      ] : undefined}
                      value={0}
                    />
                    {(levelRange(cards) || deck.tags.length > 0) && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* The span its cards actually cover, worked out from
                            them rather than stored on the deck — see
                            levelRange. First and in the mono face, because it
                            is a measurement and the rest are labels. */}
                        {levelRange(cards) && (
                          <Tag color="var(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
                            {levelRange(cards)}
                          </Tag>
                        )}
                        {/* Reported, not offered. The control for this lives on
                            the deck's own screen — a switch inside a link either
                            navigates when pressed or has to be taught not to,
                            and this is set once rather than while browsing. */}
                        {cards.some((c) => c.reversed) && (
                          <Tag color="var(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
                            ↔ both ways
                          </Tag>
                        )}
                        {deck.tags.map((t) => <Tag key={t} color={deck.accent}>{t}</Tag>)}
                      </div>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
          )
        )}
      </div>
    </>
  );
}
