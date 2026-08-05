import * as React from 'react';
import { createPortal } from 'react-dom';

/**
 * How a screen tells the shell what to put in its chrome.
 *
 * The shell used to be rendered *by* each screen, which meant React reconciled a
 * different component type at that position on every navigation and threw the
 * whole thing away — rail, sidebar and all. Nothing inside it could animate,
 * because every element was created in its final state, and the deck list lost
 * its scroll position each time. AppShell is a layout route now, so it survives,
 * and screens declare their chrome through here instead of passing props.
 */
export interface Chrome {
  /**
   * Names the object on screen — a deck, a session — not the tool. The rail
   * already says which tool you're in, so a screen with nothing of its own to
   * name (Home) omits this rather than echoing the rail.
   */
  title?: string;
  titleIcon?: string;
  /**
   * The deck sidebar. Tools that have nothing to do with decks pass `false` —
   * chrome that lists decks beside a screen which cannot use them is noise.
   */
  sidebar: boolean;
  /**
   * The streak in the top bar. Home sets this false because it shows the streak
   * in its own hero, and one screen does not need to say it twice.
   */
  streakInTopBar: boolean;
}

export const DEFAULT_CHROME: Chrome = { sidebar: true, streakInTopBar: true };

interface ChromeContextValue {
  set: (next: Chrome) => void;
  /** Where <TopRight> puts its children. Null until the shell has mounted. */
  slot: HTMLElement | null;
}

const ChromeContext = React.createContext<ChromeContextValue | null>(null);

export const ChromeProvider = ChromeContext.Provider;

const same = (a: Chrome, b: Chrome) =>
  a.title === b.title && a.titleIcon === b.titleIcon
  && a.sidebar === b.sidebar && a.streakInTopBar === b.streakInTopBar;

/** Used by AppShell to hold the current screen's chrome without looping. */
export function useChromeState() {
  const [chrome, setChrome] = React.useState<Chrome>(DEFAULT_CHROME);
  // Bails when nothing changed. Screens call set() from a layout effect on every
  // render, so returning the previous object is what stops that being a loop.
  const set = React.useCallback((next: Chrome) => {
    setChrome((prev) => (same(prev, next) ? prev : next));
  }, []);
  return { chrome, set };
}

/**
 * Declares this screen's chrome. Only primitives, so the effect's dependencies
 * are stable — anything with an identity that changes per render (a button, a
 * whole toolbar) goes through <TopRight> instead.
 *
 * A layout effect rather than a plain one: the title is painted in the same
 * frame as the screen, instead of a frame of the previous screen's title.
 */
export function useChrome(chrome: Partial<Chrome>) {
  const ctx = React.useContext(ChromeContext);
  const { title, titleIcon } = chrome;
  const sidebar = chrome.sidebar ?? DEFAULT_CHROME.sidebar;
  const streakInTopBar = chrome.streakInTopBar ?? DEFAULT_CHROME.streakInTopBar;

  React.useLayoutEffect(() => {
    ctx?.set({ title, titleIcon, sidebar, streakInTopBar });
  }, [ctx, title, titleIcon, sidebar, streakInTopBar]);
}

/**
 * Renders its children into the top bar's right-hand slot.
 *
 * A portal rather than a prop or context value: these are buttons wired to the
 * screen's own state (a dialog opener, an End session action), so they have to
 * re-render with the screen. Passing them up through an effect would need the
 * effect to re-run on every render, since JSX has a new identity each time.
 */
export function TopRight({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(ChromeContext);
  if (!ctx?.slot) return null;
  return createPortal(children, ctx.slot);
}
