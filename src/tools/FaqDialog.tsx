import * as React from 'react';
import { Dialog, Icon, playSound } from 'lingo-ds';

interface Entry { q: string; a: React.ReactNode }

/**
 * Answers to what the app's own behaviour raises, not a sales sheet.
 *
 * Every one of these is a true statement about what the code does today —
 * including the two that are bad news. An FAQ that only lists the flattering
 * answers is where a reader loses a deck and finds out afterwards that there was
 * never a backup.
 */
const ENTRIES: Entry[] = [
  {
    q: 'Where are my cards stored?',
    a: 'In this browser, in its own database. There is no account, no server, and nothing is sent anywhere — which is also why your decks do not follow you to another browser or another device.',
  },
  {
    q: 'What happens if I clear my browser data?',
    a: 'Everything goes: decks, cards and review history. Nothing is stored anywhere else, so the only way back is a backup you exported beforehand — Settings → Local data. Reset local data does the same thing deliberately.',
  },
  {
    q: 'Can I export or back up my decks?',
    a: 'Yes — Settings → Local data → Export a backup writes one JSON file holding every deck, card and review across all four workspaces. Restoring from it adds back whatever is missing and leaves anything already there alone, so importing the same file twice is harmless.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes, from the second visit. The app installs a service worker on first load and runs from it afterwards. The one thing still fetched from the network is the type, so the very first load needs a connection.',
  },
  {
    q: 'How does it decide when to show a card again?',
    a: 'A local SM-2 scheduler — the same family of algorithm as Anki. Each grade adjusts how long until the card comes back, and the four buttons show you exactly what each one will do before you press it.',
  },
  {
    q: 'Why does grading "Again" not feel like a punishment?',
    a: 'Because forgetting is the point. Spaced repetition works by finding the words you are about to lose, so a card coming back is the system doing its job, not you failing at it.',
  },
  {
    q: 'Can I install it on my phone?',
    a: 'Yes. It is a progressive web app, so your browser can add it to the home screen and it opens straight into the app with its own icon.',
  },
  {
    q: 'When are the other four tools coming?',
    a: 'They are designed but not built, which is what the "Soon" markers mean. Flashcards is the one that works today, and it works fully.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes, and open source under the MIT licence. There is no paid tier, so there is no pricing page anywhere in the product.',
  },
];

export function FaqDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  React.useEffect(() => { if (!open) setOpenIndex(0); }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Questions"
      description="What the app does with your cards, and what it does not do yet."
      width={560}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 'var(--space-6)' }}>
        {ENTRIES.map((e, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={e.q}
              style={{ borderRadius: 'var(--radius-md)', boxShadow: 'var(--ring-inset)', overflow: 'hidden' }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => { playSound('toggle'); setOpenIndex(isOpen ? null : i); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%',
                  padding: '11px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'var(--font-ui)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'grid', color: 'var(--text-muted)', flex: 'none',
                    transform: isOpen ? 'none' : 'rotate(-90deg)',
                    transition: 'transform var(--dur-fast) var(--ease-standard)',
                  }}
                >
                  <Icon name="chevron-down" size={15} />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-14)', fontWeight: 700, color: 'var(--text-strong)' }}>
                  {e.q}
                </span>
              </button>
              {isOpen && (
                <p style={{ margin: 0, padding: '0 12px 12px 38px', fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>
                  {e.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
