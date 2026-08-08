import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Checkbox, Dialog, Icon, IconButton, IllustrationPicker, Input, Select, Switch, Tag, Tooltip, playSound, useIsMobile } from 'lingo-ds';
import { TopRight, useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import * as db from '../../data/db';
import { WORKSPACES } from '../../data/seed';
import { EmptyTool } from '../EmptyTool';
import { ConfirmDialog } from '../../shell/ConfirmDialog';
import { formatDue } from '../../data/scheduler';
import { START_EASE } from '../../data/scheduler';
import { ILLUSTRATION_GROUPS, ILLUSTRATION_ITEMS, findIllustration, illustrationUrl } from '../../data/illustrations';
import { CEFR_LEVELS, asLevel, levelRange } from '../../data/types';
import type { CEFRLevel, Card as CardModel, Deck } from '../../data/types';

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
  const [level, setLevel] = React.useState<CEFRLevel | ''>('');
  const [bothWays, setBothWays] = React.useState(false);
  // Renaming and the two deletions were window.prompt and window.confirm,
  // which a browser is free not to implement — prompt threw and confirm
  // answered "no" on the reader's behalf, so all three quietly did nothing.
  const [renaming, setRenaming] = React.useState(false);
  const [rename, setRename] = React.useState('');
  const [deletingDeck, setDeletingDeck] = React.useState(false);
  const [deletingCard, setDeletingCard] = React.useState<CardModel | null>(null);
  const [reversed, setReversed] = React.useState(false);
  /**
   * Which cards survive being asked backwards, decided while the deck is in
   * front of you rather than card by card later.
   *
   * This is the moment the judgement is actually possible: reading `sei lá`
   * against "I dunno — a shrug with words" you can see at once that a dozen
   * phrases fit that gloss, and that asking for it teaches guessing. Buried in
   * each card's edit dialog, nobody would ever revisit it.
   */
  const [triage, setTriage] = React.useState<Set<string> | null>(null);

  React.useEffect(() => { setReversed(!!deck?.reversed); }, [deck?.reversed]);

  const openAdd = () => {
    setEditing(null); setFront(''); setBack(''); setPhonetic(''); setIllustration(null); setLevel('');
    // A new card inherits the deck's answer, which is what the switch is for.
    setBothWays(!!deck?.reversed); setAdding(true);
  };
  const openEdit = (card: CardModel) => {
    setEditing(card); setFront(card.front); setBack(card.back); setPhonetic(card.phonetic ?? '');
    setIllustration(card.illustration ?? null); setLevel(card.level ?? '');
    setBothWays(!!card.reversed); setAdding(true);
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

  /**
   * Turns the deck's cards on or off as a set.
   *
   * Off does not delete anything: `card.reverse` holds the schedule that
   * direction has built up, and only `reversed` stops it being asked. A switch
   * that looked reversible but threw away weeks of intervals would be a
   * destructive action wearing a preference's clothes.
   */
  const applyDirections = async (chosen: Set<string>) => {
    await saveDeck({ ...deck!, reversed: chosen.size > 0 });
    await Promise.all(cards.map((card) => {
      const next = chosen.has(card.id);
      if (!!card.reversed === next) return Promise.resolve();
      return saveCard({ ...card, reversed: next || undefined });
    }));
  };

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
        level: level || undefined,
        reversed: bothWays || undefined,
      });
    } else {
      await saveCard({
        id: `card-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        deckId,
        front: front.trim(),
        back: back.trim(),
        phonetic: phonetic.trim() || undefined,
        illustration: illustration ?? undefined,
        level: level || undefined,
        reversed: bothWays || undefined,
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
            {(levelRange(cards) || deck.tags.length > 0) && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {levelRange(cards) && (
                  <Tag color="var(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
                    {levelRange(cards)}
                  </Tag>
                )}
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
              onClick={() => { setRename(deck.name); setRenaming(true); }}
            >
              Rename
            </Button>
            <Button
              variant="ghost"
              size={isMobile ? 'lg' : 'sm'}
              style={isMobile ? { flex: 1, minWidth: 0 } : undefined}
              iconLeft={<Icon name="trash-2" size={15} />}
              onClick={() => setDeletingDeck(true)}
            >
              Delete deck
            </Button>
          </div>
        </header>

        {/* A deck-level setting, which is why it sits with Rename and Delete
            rather than in the list of decks. That list is a page of links — a
            switch inside one either navigates when you press it or has to be
            taught not to — and this is a decision made once, not while
            browsing. The list reports it instead. */}
        {cards.length > 0 && (
          <div style={{ marginBottom: 'var(--space-7)' }}>
            <Switch
              label="Ask both ways"
              hint={reversed
                ? `${cards.filter((c) => c.reversed).length} of ${cards.length} cards also ask for the word from its meaning.`
                : 'Also ask for the word from its meaning — the harder direction, and the one that lets you say it rather than only recognise it.'}
              checked={reversed}
              onChange={(next) => {
                if (next) {
                  // Everything ticked to begin with, then pared down: the deck
                  // was written in one direction and most of it will survive
                  // the other, so the work is spotting the exceptions.
                  setTriage(new Set(cards.map((c) => c.id)));
                } else {
                  setReversed(false);
                  void applyDirections(new Set());
                }
              }}
            />
          </div>
        )}

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

                  {/* Which way this card is asked, where a column of them reads
                      at a glance. Only shown when it is both, because one
                      direction is the ordinary case and does not need saying. */}
                  {card.reversed && (
                    <Tooltip label="Asked both ways">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-12)', color: 'var(--text-muted)', flex: 'none' }} aria-label="Asked both ways">
                        ↔
                      </span>
                    </Tooltip>
                  )}
                  {/* Beside the scheduler's state, not among the card's tags:
                      it says something about the word rather than about where
                      the word has got to. Mono and muted so a column of them
                      reads as a scale. */}
                  {!isMobile && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-11)', fontWeight: 700, color: 'var(--text-muted)', minWidth: 20, textAlign: 'right' }}>
                      {card.level ?? ''}
                    </span>
                  )}
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
                      onClick={() => setDeletingCard(card)}
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
        open={triage !== null}
        onClose={() => { setTriage(null); setReversed(!!deck.reversed); }}
        title="Which cards work backwards?"
        description="A card reverses well when its meaning points at one word and no other. Untick the ones it does not."
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setTriage(null); setReversed(!!deck.reversed); }}>Cancel</Button>
            <Button
              sound={false}
              disabled={!triage || triage.size === 0}
              onClick={async () => {
                const chosen = triage ?? new Set<string>();
                setTriage(null);
                setReversed(true);
                await applyDirections(chosen);
              }}
            >
              Ask {triage?.size ?? 0} both ways
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingBottom: 'var(--space-4)' }}>
          {cards.map((card) => {
            const on = !!triage?.has(card.id);
            return (
              // A container each, so eight glosses read as eight things to weigh
              // rather than a paragraph with boxes in it. No onClick on the
              // card: the checkbox inside is already the button, and both
              // would fire on the same press. It fills the card instead, which
              // makes the whole row the target.
              <Card
                key={card.id}
                padding="10px 14px"
                // Set aside, not switched off. An excluded row drops to the
                // sunken surface rather than fading: opacity is this design
                // system's disabled treatment — Checkbox itself dims to 0.45
                // when it cannot be pressed — and these can be ticked straight
                // back. It also has to stay legible, because deciding to put one
                // back means re-reading the gloss.
                style={{
                  // Both arms named. `undefined` does not fall back to the
                  // card's own background: it replaces it in the style object
                  // and React skips the property, leaving the row with none.
                  background: on ? 'var(--surface-card)' : 'var(--surface-sunken)',
                  transition: 'var(--transition-surface)',
                }}
              >
                <Checkbox
                  checked={on}
                  onChange={(_, next) => setTriage((prev) => {
                    const set = new Set(prev ?? []);
                    if (next) set.add(card.id); else set.delete(card.id);
                    return set;
                  })}
                  style={{ width: '100%' }}
                  // The gloss is the whole point of the list: you are judging
                  // whether it points back at one word, so it has to sit beside
                  // the word itself.
                  label={<span><strong style={{ fontWeight: 800 }}>{card.front}</strong>{' — '}{card.back}</span>}
                />
              </Card>
            );
          })}
        </div>
      </Dialog>

      <Dialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename deck"
        description="The name is only for you — nothing else refers to it."
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(false)}>Cancel</Button>
            <Button
              sound={false}
              disabled={!rename.trim()}
              onClick={async () => {
                await saveDeck({ ...deck, name: rename.trim() });
                setRenaming(false);
              }}
            >
              Save name
            </Button>
          </>
        }
      >
        <div style={{ paddingBottom: 'var(--space-4)' }}>
          <Input
            label="Name"
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== 'Enter' || !rename.trim()) return;
              await saveDeck({ ...deck, name: rename.trim() });
              setRenaming(false);
            }}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={deletingDeck}
        title={`Delete "${deck.name}"?`}
        description={`Its ${cards.length} ${cards.length === 1 ? 'card' : 'cards'} go with it, along with everything the scheduler has learned about them. This cannot be undone.`}
        confirmLabel="Delete deck"
        onCancel={() => setDeletingDeck(false)}
        onConfirm={async () => {
          setDeletingDeck(false);
          await removeDeck(deck.id);
          navigate('/app/cards');
        }}
      />

      <ConfirmDialog
        open={!!deletingCard}
        title={`Delete "${deletingCard?.front ?? ''}"?`}
        description="The card and its review history go. This cannot be undone."
        confirmLabel="Delete card"
        onCancel={() => setDeletingCard(null)}
        onConfirm={() => {
          if (deletingCard) { playSound('cardRemoved'); void removeCard(deletingCard.id); }
          setDeletingCard(null);
        }}
      />

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
          {/* "Ungraded" rather than an empty first option: a card someone
              wrote themselves does not have to carry a level, and the list
              should say so instead of leaving a blank to be interpreted. */}
          <Select
            label="Level"
            value={level}
            options={[{ value: '', label: 'Ungraded' }, ...CEFR_LEVELS]}
            onChange={(e) => setLevel(asLevel(e.target.value) ?? '')}
          />
          <Checkbox
            label="Ask both ways"
            hint="Also show the meaning and ask for the word. Leave off for anything whose meaning fits more than one word."
            checked={bothWays}
            onChange={(_, next) => setBothWays(next)}
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
