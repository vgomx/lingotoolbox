import * as React from 'react';
import { Dialog } from 'lingo-ds';

interface Shortcut { keys: string[]; does: string; where: string }

/**
 * Every shortcut the app actually listens for, and nothing else.
 *
 * Written from the handlers rather than from memory — a shortcut sheet that
 * lists a key nobody bound is worse than no sheet, because the reader concludes
 * the app is broken rather than the documentation. The "N" below was in that
 * state: advertised on the Add-a-card tooltip since the screen was built, with
 * no listener anywhere. It works now.
 */
const SHORTCUTS: Shortcut[] = [
  { keys: ['Space'], does: 'Show the answer', where: 'Review' },
  { keys: ['Enter'], does: 'Show the answer', where: 'Review' },
  { keys: ['1'], does: 'Grade Again', where: 'Review, after the answer' },
  { keys: ['2'], does: 'Grade Hard', where: 'Review, after the answer' },
  { keys: ['3'], does: 'Grade Good', where: 'Review, after the answer' },
  { keys: ['4'], does: 'Grade Easy', where: 'Review, after the answer' },
  // Added after the grades and missed by this list until someone read it: the
  // file's own note says it is written from the handlers, and it had stopped
  // being true three shortcuts ago.
  { keys: ['Z'], does: 'Take back the last answer', where: 'Review' },
  { keys: ['G'], does: 'The grammar note for this card', where: 'Review, when there is one' },
  { keys: ['E'], does: 'Where this word comes from', where: 'Review, when there is one' },
  { keys: ['N'], does: 'Add a card', where: 'Inside a deck' },
  { keys: ['⌘', 'B'], does: 'Show or hide the deck list', where: 'Flashcards' },
  { keys: ['Esc'], does: 'Close a menu or dialog', where: 'Anywhere' },
];

const kbd: React.CSSProperties = {
  display: 'inline-grid', placeItems: 'center', minWidth: 24, height: 24, padding: '0 6px',
  borderRadius: 'var(--radius-xs)', background: 'var(--surface-input)',
  boxShadow: 'inset 0 0 0 1px var(--border)',
  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-11)', color: 'var(--text-body)',
};

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  // ⌘ on a Mac, Ctrl everywhere else — the binding checks both, so the sheet
  // should show whichever one the reader actually has under their thumb.
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Reviewing is meant to be done without the mouse — flip, grade, repeat."
      width={480}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 'var(--space-6)' }}>
        {SHORTCUTS.map((s) => (
          <div
            key={s.keys.join('+') + s.does}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              padding: '8px 10px', borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ display: 'flex', gap: 3, flex: 'none', minWidth: 76 }}>
              {s.keys.map((k) => <kbd key={k} style={kbd}>{k === '⌘' && !isMac ? 'Ctrl' : k}</kbd>)}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-14)', fontWeight: 600, color: 'var(--text-strong)' }}>
              {s.does}
            </span>
            <span style={{ flex: 'none', fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>
              {s.where}
            </span>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
