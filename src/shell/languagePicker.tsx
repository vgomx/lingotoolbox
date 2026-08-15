import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Dialog, Icon, playSound } from 'lingo-ds';
import { useStore } from '../state/store';
import { WORKSPACES } from '../data/seed';
import { flagUrl } from '../data/illustrations';
import type { LanguageCode } from '../data/types';

/**
 * One language selector, opened from anywhere that offers to change it.
 *
 * There were three, and they were three different things: a popover to the
 * right of the rail on a desktop, a popover opening upward from the dock's More
 * sheet on a phone, and a plain <Select> of names in Settings that did not show
 * a flag at all. Same decision, three shapes, and the Settings one silently
 * skipped the switching overlay the other two showed, because it wrote the
 * preference directly rather than going through setLanguage.
 *
 * A dialog is the shape that survives every screen the app runs on: the design
 * system's Dialog is a centred modal on a desktop and the sheet that comes up
 * from the bottom on a phone, which is the right gesture in both places without
 * either being a special case here.
 *
 * The entry points stay where they were and gain one — the workspace name on
 * Home, which reads as the thing you would press to change it and until now was
 * not pressable.
 */

type Open = () => void;

const Ctx = React.createContext<Open | null>(null);

/**
 * Opens the picker. Returns null where there is no provider — which is the
 * marketing page, not a bug, and lets an entry point decide to render nothing
 * rather than throw.
 */
export function useLanguagePicker(): Open | null {
  return React.useContext(Ctx);
}

function Choice({ workspace, selected, onChoose }: {
  workspace: (typeof WORKSPACES)[number];
  selected: boolean;
  onChoose: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onChoose}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        width: '100%', padding: '12px 14px', border: 'none', cursor: 'pointer',
        borderRadius: 'var(--radius-md)', font: 'inherit', textAlign: 'left',
        fontSize: 'var(--fs-16)', color: 'var(--text-strong)',
        background: selected ? 'var(--surface-sunken)' : hovered ? 'var(--surface-hover)' : 'transparent',
        // The selected row carries the workspace's own colour as a hairline, the
        // way the deck rows do — it is the one place a language has a colour.
        boxShadow: selected ? `inset 0 0 0 1px ${workspace.color}` : undefined,
        transition: 'var(--transition-control)',
      }}
    >
      {/* alt="" — the name is beside it, and "flag: Netherlands, Dutch" says it
          twice. Flags never appear without the name written out. */}
      <img src={flagUrl(workspace.flagHex)} alt="" width={26} height={26} style={{ display: 'block', flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0 }}>{workspace.name}</span>
      {selected && <Icon name="check" size={18} style={{ color: workspace.color, flex: 'none' }} />}
    </button>
  );
}

export function LanguagePickerProvider({ children }: { children: React.ReactNode }) {
  const { workspace, setLanguage } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  /* Stable, so an entry point holding it in a dependency array does not
     re-subscribe on every render of this provider. */
  const show = React.useCallback(() => {
    // `toggle`: this puts a panel up, which is what the rail's trigger has
    // always said it does.
    playSound('toggle');
    setOpen(true);
  }, []);

  const choose = (code: LanguageCode) => {
    setOpen(false);
    if (code === workspace.code) return;
    setLanguage(code);
    /*
     * Home, not where you were.
     *
     * Every screen below Home is a view of one workspace, so staying put after
     * a switch means staying on a screen about the workspace you just left —
     * a deck that no longer exists, a word whose etymology is in another
     * language. Home is the one screen that is about whichever workspace you
     * are in.
     */
    navigate('/app');
  };

  return (
    <Ctx.Provider value={show}>
      {children}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Language track"
        description="Decks, notes and etymology all follow the track you are on."
        width={420}
      >
        {/* The dialog's body is padded on the sides only, so that a footer bar
            can close off the bottom. This one has no footer — every row is a
            decision and the header's X is the way out — so it closes its own
            box, as the FAQ dialog does. Without it the "Soon" note sat flush on
            the dialog's bottom edge. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', paddingBottom: 'var(--space-6)' }}>
        <div role="menu" aria-label="Language track" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {WORKSPACES.map((w) => (
            <Choice
              key={w.code}
              workspace={w}
              selected={w.code === workspace.code}
              onChoose={() => choose(w.code)}
            />
          ))}
        </div>

        {/* Under the list, because this is where someone looks for a language
            that is not here yet. Storage is answered in Settings and in the
            deck sidebar's footer, so it is not repeated here. */}
        <span
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0 2px',
            fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-normal)',
          }}
        >
          <Badge tone="neutral" style={{ flex: 'none' }}>Soon</Badge>
          More languages are planned.
        </span>
        </div>
      </Dialog>
    </Ctx.Provider>
  );
}
