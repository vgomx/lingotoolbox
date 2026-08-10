import * as React from 'react';
import { LanguagePanel } from './LanguagePanel';

interface Target { code: string; name: string; href: string | null; article: string | null }

const Ctx = React.createContext<((t: Target) => void) | null>(null);

/**
 * Holds whichever language is open, for the one panel that shows it.
 *
 * A context rather than state passed down, because the two places a stamp
 * appears cannot thread it: WordTree recurses into itself four levels deep,
 * and the Explorer home renders a grid of cards. Threading a handler through
 * both would put a prop on every intermediate component that only exists to
 * hand it along.
 *
 * One panel for the whole tree, not one per stamp. Forty stamps on a screen
 * are forty mounted dialogs otherwise, thirty-nine of them closed.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = React.useState<Target | null>(null);
  const open = React.useCallback((t: Target) => setTarget(t), []);
  const close = React.useCallback(() => setTarget(null), []);

  return (
    <Ctx.Provider value={open}>
      {children}
      <LanguagePanel
        code={target?.code ?? null}
        name={target?.name ?? ''}
        href={target?.href ?? null}
        article={target?.article ?? null}
        onClose={close}
      />
    </Ctx.Provider>
  );
}

/**
 * Returns a handler for a language stamp, or null outside a provider.
 *
 * Null rather than throwing: a stamp with no panel behind it is still a
 * perfectly good link to Wikipedia, which is what it was before this existed.
 * The chain cards render in places that have no reason to carry a dialog.
 */
export function useOpenLanguage(): ((t: Target) => void) | null {
  return React.useContext(Ctx);
}
