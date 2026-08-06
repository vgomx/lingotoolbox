import * as React from 'react';

export interface MenuItemProps {
  children: React.ReactNode;
  /** Marks the current choice — the language you are in, not the one under the cursor. */
  selected?: boolean;
  onClick?: () => void;
}

/**
 * One row in a dropdown, shared by the language picker and the help menu.
 *
 * Extracted because the two menus were each drawing their own rows and only one
 * of them dressed the selected state — so a hover added to one would have drifted
 * from the other by the next change.
 *
 * Hover and focus resolve to the same appearance on purpose. A menu is opened as
 * often by keyboard as by mouse, and a keyboard user arrowing through rows that
 * look identical has no idea which one Enter will take. The DS has `SidebarItem`
 * for the same job in a different context; if a third menu appears, this belongs
 * there beside it.
 */
export function MenuItem({ children, selected = false, onClick }: MenuItemProps) {
  const [active, setActive] = React.useState(false);

  return (
    <button
      type="button"
      role="menuitem"
      aria-current={selected || undefined}
      onClick={onClick}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        height: 38, padding: '0 10px', border: 'none', cursor: 'pointer',
        borderRadius: 'var(--radius-md)',
        // Selected is a state of the data; active is a state of the pointer. A
        // selected row still has to answer the cursor, so it gets the brighter
        // step rather than being frozen at its resting fill.
        background: selected
          ? (active ? 'var(--surface-raised-hover)' : 'var(--surface-card)')
          : (active ? 'var(--surface-hover)' : 'transparent'),
        color: 'var(--text-strong)',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-14)', fontWeight: 800, textAlign: 'left',
        transition: 'var(--transition-control)',
      }}
    >
      {children}
    </button>
  );
}
