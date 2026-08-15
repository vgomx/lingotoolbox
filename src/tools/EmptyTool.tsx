import * as React from 'react';
import { Icon } from 'lingo-ds';

export interface EmptyToolProps {
  icon: string;
  accent: string;
  /** What's missing. */
  title: string;
  /** One sentence, then the one action — never more. */
  description: string;
  action?: React.ReactNode;
  /** Drawn in place of the icon badge. See the note where it renders. */
  art?: React.ReactNode;
}

/**
 * The standard nothing-to-show surface: a large icon and a sentence. Illustration
 * is not part of this system, so a screen with nothing to show gets type and colour.
 */
export function EmptyTool({ icon, accent, title, description, action, art }: EmptyToolProps) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: 'var(--space-5)', padding: 'var(--space-10) var(--space-6)',
        minHeight: 420,
      }}
    >
      {/* A picture instead of the badge, where there is one worth drawing. The
          badge is a label for a state; art is for the one screen that is about
          something having gone well rather than about something being absent. */}
      {art ?? (
        <span
          style={{
            width: 72, height: 72, display: 'grid', placeItems: 'center',
            borderRadius: 'var(--radius-xl)',
            background: `color-mix(in oklab, ${accent} 16%, transparent)`,
            color: accent,
          }}
        >
          <Icon name={icon} size={32} />
        </span>
      )}
      <h2
        style={{
          margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-24)',
          fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0, maxWidth: 380, fontSize: 'var(--fs-14)', color: 'var(--text-muted)',
          lineHeight: 'var(--lh-relaxed)',
        }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}
