import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Dialog, Icon, IconButton, IllustrationPicker, Input, Tag, Tooltip, playSound, useIsMobile } from 'lingo-ds';
import { TopRight, useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import * as db from '../../data/db';
import { WORKSPACES } from '../../data/seed';
import { EmptyTool } from '../EmptyTool';
import { formatDue } from '../../data/scheduler';
import { START_EASE } from '../../data/scheduler';
import { ILLUSTRATION_GROUPS, ILLUSTRATION_ITEMS, findIllustration, illustrationUrl } from '../../data/illustrations';
import type { Card as CardModel, Deck } from '../../data/types';

const page: React.CSSProperties = {
  maxWidth: 'var(--content-max, 1120px)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
};

const STATE_TONE = {
  new: 'info',
  learning: 'warning',
  relearning: 'warning',
  review: 'success',
} as const;

export function DeckDetail() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();
  const { ready, decks, language, setLanguage, cardsInDeck, dueInDeck, saveCard, removeCard, removeDeck, saveDeck } = useStore();

  const deck = decks.find((d) => d.id === deckId);
  const cards = cardsInDeck(deckId);
  const due = dueInDeck(deckId).length;
  const anyIllustrated = cards.some((c) => c.illustration);
  const isMobile = useIsMobile();

  // Above the not-found return, because hooks cannot be conditional. A missing
  // deck falls back to the tool's own name rather than an empty title bar.
  useChrome({
    title: deck?.name ?? 'Flashcards',
    titleIcon: 'layers',
    // No parent when there is no deck: the crumb is the path down to this
    // screen, and with nothing here to be a child of it read "Flashcards ›
    // Flashcards" — a link back to the page it claims you came from.
    parent: deck ? { label: 'Flashcards', to: '/app/cards' } : undefined,
    sidebar: true,
  });

  /**
   * A deck id missing from this workspace has two very different explanations,
   * and the screen used to assert the alarming one. `decks` is filtered by
   * language, so the back button after a workspace switch lands here and was
   * told the deck had been deleted from the browser. The database is not
   * filtered, so it can tell the two apart.
   *
   * `undefined` means the question is still open — the screen shows nothing
   * rather than flashing "not found" for a frame on the way to the answer.
   */
  const [elsewhere, setElsewhere] = React.useState<Deck | null | undefined>(undefined);
  React.useEffect(() => {
    if (!ready || deck) return undefined;
    let live = true;
    void db.getDeck(deckId).then((found) => {
      if (live) setElsewhere(found && found.language !== language ? found : null);
    });
    return () => { live = false; };
  }, [ready, deck, deckId, language]);

  const [editing, setEditing] = React.useState<CardModel | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [front, setFront] = React.useState('');
  const [back, setBack] = React.useState('');
  const [phonetic, setPhonetic] = React.useState('');
  const [illustration, setIllustration] = React.useState<string | null>(null);

  const openAdd = () => {
    setEditing(null); setFront(''); setBack(''); setPhonetic(''); setIllustration(null); setAdding(true);
  };
  const openEdit = (card: CardModel) => {
    setEditing(card); setFront(card.front); setBack(card.back); setPhonetic(card.phonetic ?? '');
    setIllustration(card.illustration ?? null); setAdding(true);
  };
  const close = () => setAdding(false);

  // The Add-a-card tooltip has advertised "N" since the screen was built, and
  // nothing listened for it. Same guards as the review keys: not while typing,
  // and not when a modifier is held, so ⌘N still opens a browser window.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      openAdd();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const submit = async () => {
    if (!front.trim() || !back.trim()) return;
    const now = Date.now();
    if (editing) {
      await saveCard({
        ...editing,
        front: front.trim(),
        back: back.trim(),
        phonetic: phonetic.trim() || undefined,
        illustration: illustration ?? undefined,
      });
    } else {
      await saveCard({
        id: `card-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        deckId,
        front: front.trim(),
        back: back.trim(),
        phonetic: phonetic.trim() || undefined,
        illustration: illustration ?? undefined,
        tags: [],
        createdAt: now,
        state: 'new',
        due: now,
        interval: 0,
        ease: START_EASE,
        reps: 0,
        lapses: 0,
      });
    }
    playSound('cardAdded');
    close();
  };

  if (!deck) {
    if (!ready || elsewhere === undefined) return <div style={page} />;

    if (elsewhere) {
      const home = WORKSPACES.find((w) => w.code === elsewhere.language);
      return (
        <EmptyTool
          icon="languages"
          accent="var(--tool-flashcards)"
          title={`"${elsewhere.name}" is in ${home?.name ?? 'another'}`}
          description={`You're in ${WORKSPACES.find((w) => w.code === language)?.name ?? 'another workspace'}. Decks belong to the language you made them for.`}
          action={
            <div style={{ display: 'flex', gap: 'var(--gap-inline)' }}>
              <Link to="/app/cards" style={{ textDecoration: 'none' }}><Button variant="ghost">Back to decks</Button></Link>
              <Button onClick={() => setLanguage(elsewhere.language)}>
                Switch to {home?.name ?? elsewhere.language}
              </Button>
            </div>
          }
        />
      );
    }

    return (
      <EmptyTool
        icon="circle-alert"
        accent="var(--danger)"
        title="Deck not found"
        description="That deck no longer exists. It may have been deleted from this browser."
        action={<Link to="/app/cards" style={{ textDecoration: 'none' }}><Button variant="secondary">Back to decks</Button></Link>}
      />
    );
  }

  return (
    <>
      <TopRight>
        <Tooltip label="Add a card" shortcut="N">
          <IconButton label="Add a card" onClick={openAdd}><Icon name="plus" size={18} /></IconButton>
        </Tooltip>
        {due > 0 && (isMobile ? (
          // Icon-only on a phone: "Review 6" plus a 44px add button plus the
          // language pill does not fit a 375px bar, and the count is already in
          // the header line right below.
          <IconButton label={`Review ${due} cards`} size="lg" variant="brand" onClick={() => navigate(`/app/review/${deck.id}`)}>
            <Icon name="play" size={18} />
          </IconButton>
        ) : (
          <Button size="sm" iconLeft={<Icon name="play" size={15} />} onClick={() => navigate(`/app/review/${deck.id}`)}>
            Review {due}
          </Button>
        ))}
      </TopRight>
      <div style={page}>
        <header style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {cards.length} cards · {due} due
            </span>
            <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15 }}>
              {deck.name}
            </h1>
            {deck.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {deck.tags.map((t) => <Tag key={t} color={deck.accent}>{t}</Tag>)}
              </div>
            )}
          </div>
          {/* Side by side on a phone rather than stacked. The header goes to a
              column at this width so the title gets the full line, which sent
              these two down it as well — two centred full-width rows spending
              ~250px above the first card on the things you do least. `display:
              contents` leaves the desktop row exactly as it was. */}
          <div style={isMobile
            ? { display: 'flex', gap: 'var(--gap-inline)' }
            : { display: 'contents' }}
          >
            <Button
              variant="ghost"
              size={isMobile ? 'lg' : 'sm'}
              style={isMobile ? { flex: 1, minWidth: 0 } : undefined}
              iconLeft={<Icon name="pencil" size={15} />}
              onClick={async () => {
                const name = window.prompt('Rename deck', deck.name);
                if (name?.trim()) await saveDeck({ ...deck, name: name.trim() });
              }}
            >
              Rename
            </Button>
            <Button
              variant="ghost"
              size={isMobile ? 'lg' : 'sm'}
              style={isMobile ? { flex: 1, minWidth: 0 } : undefined}
              iconLeft={<Icon name="trash-2" size={15} />}
              onClick={async () => {
                if (!window.confirm(`Delete "${deck.name}" and its ${cards.length} cards? This cannot be undone.`)) return;
                await removeDeck(deck.id);
                navigate('/app/cards');
              }}
            >
              Delete deck
            </Button>
          </div>
        </header>

        {cards.length === 0 ? (
          <EmptyTool
            icon="layers"
            accent={deck.accent}
            title="No cards yet"
            description="A card is a word on one side and its meaning on the other."
            action={<Button onClick={openAdd} iconLeft={<Icon name="plus" size={16} />}>Add a card</Button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {cards.map((card) => (
              <Card key={card.id} padding="14px 16px">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
                  {/* The gutter is reserved for the whole deck as soon as one
                      card has an illustration, so a deck that uses them keeps a
                      straight left edge instead of jumping in and out by 44px
                      down the list. Decks with none reserve nothing and keep
                      their tighter rows. 44px is the design system's floor for
                      an illustration on a card. */}
                  {anyIllustrated && (
                    <span style={{ flex: 'none', width: 44, height: 44, display: 'grid', placeItems: 'center' }}>
                      {card.illustration && (
                        <img
                          src={illustrationUrl(card.illustration)}
                          alt={findIllustration(card.illustration)?.name ?? ''}
                          width={44}
                          height={44}
                          style={{ display: 'block' }}
                        />
                      )}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)' }}>
                        {card.front}
                      </span>
                      {card.phonetic && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>
                          {card.phonetic}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>{card.back}</span>
                  </div>

                  {!isMobile && <Badge tone={STATE_TONE[card.state]}>{card.state}</Badge>}
                  {!isMobile && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-11)', color: 'var(--text-muted)', minWidth: 44, textAlign: 'right' }}>
                      {card.due <= Date.now() ? 'due' : formatDue(card.due - Date.now())}
                    </span>
                  )}

                  <Tooltip label="Edit card">
                    <IconButton label="Edit card" size="sm" onClick={() => openEdit(card)}>
                      <Icon name="pencil" size={15} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip label="Delete card">
                    <IconButton
                      label="Delete card"
                      size="sm"
                      variant="danger"
                      sound={false}
                      onClick={() => {
                        if (!window.confirm(`Delete "${card.front}"?`)) return;
                        playSound('cardRemoved');
                        void removeCard(card.id);
                      }}
                    >
                      <Icon name="trash-2" size={15} />
                    </IconButton>
                  </Tooltip>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={adding}
        onClose={close}
        title={editing ? 'Edit card' : 'Add a card'}
        description={editing ? 'Changes apply to the next review.' : 'New cards come up in the next session.'}
        width={460}
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button sound={false} onClick={submit} disabled={!front.trim() || !back.trim()}>
              {editing ? 'Save card' : 'Add card'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', paddingBottom: 'var(--space-4)' }}>
          <Input label="Front" placeholder="gezellig" value={front} onChange={(e) => setFront(e.target.value)} />
          <Input label="Back" placeholder="warm, companionable, good to be in" value={back} onChange={(e) => setBack(e.target.value)} />
          <Input
            label="Phonetic"
            hint="Optional — IPA or romanisation, set in the mono face."
            placeholder="/ɣəˈzɛləx/"
            value={phonetic}
            onChange={(e) => setPhonetic(e.target.value)}
          />
          <IllustrationPicker
            label="Illustration"
            hint="Optional. Shows with the answer when you flip the card."
            items={ILLUSTRATION_ITEMS}
            groups={ILLUSTRATION_GROUPS}
            value={illustration}
            onChange={setIllustration}
            height={196}
          />
        </div>
      </Dialog>
    </>
  );
}
