import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, IconButton, MenuItem, Tooltip } from 'lingo-ds';
import { FaqDialog } from '../tools/FaqDialog';
import { ShortcutsDialog } from '../tools/ShortcutsDialog';

type Panel = 'faq' | 'shortcuts' | null;

/**
 * The three things a reader might want that are not part of doing the work:
 * what this is, how it behaves, and what the keys do.
 *
 * A menu rather than three icons, because none of them is frequent enough to
 * hold a place in the top bar, and one question mark is a more honest label for
 * "help" than three competing glyphs.
 */
export function HelpMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [panel, setPanel] = React.useState<Panel>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <>
      <div style={{ position: 'relative', display: 'grid' }} onClick={(e) => e.stopPropagation()}>
        <Tooltip label="About, FAQ and shortcuts">
          <IconButton
            label="Help and information"
            aria-haspopup="menu"
            aria-expanded={open}
            active={open}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="circle-question-mark" size={18} />
          </IconButton>
        </Tooltip>

        {open && (
          <div
            role="menu"
            style={{
              position: 'absolute', top: 42, right: 0, minWidth: 208, zIndex: 40, padding: 6,
              borderRadius: 'var(--radius-lg)', background: 'var(--surface-raised)',
              boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            <MenuItem onClick={choose(() => navigate('/'))}>
              <Icon name="house" size={16} style={{ color: 'var(--text-muted)', flex: 'none' }} />
              About Lingo Toolbox
            </MenuItem>
            <MenuItem onClick={choose(() => setPanel('faq'))}>
              <Icon name="circle-question-mark" size={16} style={{ color: 'var(--text-muted)', flex: 'none' }} />
              FAQ
            </MenuItem>
            <MenuItem onClick={choose(() => setPanel('shortcuts'))}>
              <Icon name="text-cursor-input" size={16} style={{ color: 'var(--text-muted)', flex: 'none' }} />
              Keyboard shortcuts
            </MenuItem>
          </div>
        )}
      </div>

      <FaqDialog open={panel === 'faq'} onClose={() => setPanel(null)} />
      <ShortcutsDialog open={panel === 'shortcuts'} onClose={() => setPanel(null)} />
    </>
  );
}
