import * as React from 'react';
import { Badge, Button, Card, Dialog, Icon, playSound } from 'lingo-ds';
import { useStore } from '../../state/store';
import { packsFor, type Pack } from '../../data/packs';
import { SEED, SEED_NOTES } from '../../data/seed';
import { HAS_CONJUGATION } from '../../data/conjugation';

/**
 * The catalogue: grammar themes you can add to this workspace.
 *
 * Called decks to the reader and packs in the code, deliberately. What arrives
 * is a deck — the word the app already uses for a set of cards you practise —
 * and inventing a second one for the thing that becomes a deck would make
 * people learn a word for something they can already name. The code cannot
 * borrow it: `Deck` is the record this installs, so `Pack` stays as the name
 * for the offer rather than for the thing offered.
 *
 * Content used to be pushed. Every install wrote twenty-two decks across four
 * languages whether or not the reader would ever open them, which left nothing
 * to choose and no way to tell what you had picked from what you had been
 * given. A fresh install now arrives with one pack and this is where the rest
 * lives.
 *
 * It sits with the decks rather than in the rail: a pack becomes decks, and
 * this is where decks are. It is also where somebody notices they want more to
 * practise, which is the moment worth catching.
 */

/** What a pack would add, counted from the material it names. */
function contents(pack: Pack) {
  const deck = SEED[pack.language].find((d) => d.id === pack.deck);
  const notes = SEED_NOTES[pack.language].filter((n) => pack.notes.includes(n.id));
  return {
    cards: deck?.cards.length ?? 0,
    notes: notes.length,
    /* Only where the language has tables to drill. A verb list in a workspace
       with no conjugation data is a promise nothing can keep. */
    verbs: HAS_CONJUGATION[pack.language] ? pack.verbs?.length ?? 0 : 0,
    noteTitles: notes.map((n) => n.title),
  };
}

function Row({ pack, added, onAdd }: { pack: Pack; added: boolean; onAdd: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const has = contents(pack);

  const add = async () => {
    if (busy || added) return;
    setBusy(true);
    await onAdd();
    // The sound a thing arriving makes, not a celebration — the pack is the
    // start of the work rather than the end of it.
    playSound('toggle');
    setBusy(false);
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-5)' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-16)', fontWeight: 800, color: 'var(--text-strong)' }}>
              {pack.name}
            </h3>
            {pack.starter && <Badge tone="neutral">Starter</Badge>}
          </div>

          <p style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
            {pack.blurb}
          </p>

          {/* What arrives, named by the tool it arrives in — a count of "items"
              would be true and useless. */}
          <div
            style={{
              display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap',
              fontSize: 'var(--fs-13)', color: 'var(--text-faint)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="layers" size={13} /> {has.cards} cards
            </span>
            {has.notes > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon name="scroll-text" size={13} /> {has.notes === 1 ? '1 note' : `${has.notes} notes`}
              </span>
            )}
            {has.verbs > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon name="spell-check" size={13} /> {has.verbs} verbs to drill
              </span>
            )}
          </div>

          {/* The rules by name. This is the part that makes it a grammar pack
              rather than a word list, so it is stated rather than counted. */}
          {has.noteTitles.length > 0 && (
            <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-normal)' }}>
              {has.noteTitles.join(' · ')}
            </p>
          )}
        </div>

        <div style={{ flex: 'none' }}>
          {added ? (
            /* Not a disabled button. There is nothing to press, and a greyed
               control invites the press anyway. */
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 'var(--fs-13)', fontWeight: 700, color: 'var(--success)',
              }}
            >
              <Icon name="circle-check" size={16} /> Added
            </span>
          ) : (
            <Button variant="secondary" onClick={add} disabled={busy}>
              {busy ? 'Adding…' : 'Add'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function PackCatalogue({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { workspace, language, installed, addPack } = useStore();
  const packs = packsFor(language);
  const left = packs.filter((p) => !installed.has(p.id)).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${workspace.name} decks`}
      description={
        left === 0
          ? 'Every deck in this workspace has been added.'
          : 'A rule, the words that exercise it, and the verbs to drill it on.'
      }
      width={620}
    >
      {/* The body is padded at the sides only — a footer would close it off and
          there is none, so it closes its own box, as the FAQ dialog does. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: 'var(--space-6)' }}>
        {packs.map((p) => (
          <Row key={p.id} pack={p} added={installed.has(p.id)} onAdd={() => addPack(p)} />
        ))}
      </div>
    </Dialog>
  );
}
