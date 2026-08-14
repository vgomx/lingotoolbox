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
   * One step back up, rendered as a link before the title. A deck opened from
   * the list had no way back to the list except the rail icon, which is a thing
   * you have to already know rather than something the screen tells you.
   *
   * Only one level: this is a two-deep tool, and a full breadcrumb trail for
   * two items is ceremony.
   */
  parent?: { label: string; to: string };
  /**
   * The deck sidebar. Off unless a screen asks for it, because decks belong to
   * Flashcards — listing them beside a screen that cannot act on them is chrome
   * pretending to be navigation. Opt in rather than opt out, so a tool added
   * later doesn't inherit a deck list by saying nothing.
   */
  sidebar: boolean;
  /**
   * The streak in the top bar. Home sets this false because it shows the streak
   * in its own hero, and one screen does not need to say it twice.
   */
  streakInTopBar: boolean;
  /**
   * The horizontal lockup, centred in the top bar on a phone.
   *
   * Home only. A desktop has the rail, which carries the mark permanently; a
   * phone has the dock, which does not, so without this the app never says its
   * own name anywhere on a phone. Every other screen needs that space for its
   * own title.
   */
  logo?: boolean;
  /**
   * Drop the top bar entirely on a phone.
   *
   * For a screen that already carries its own way out. The bar exists to say
   * what you are looking at and how to leave it, and a screen whose first line
   * is a heading with a close button beside it says both — so the bar becomes a
   * second title above the real one and a second exit beside the real one, on
   * the display that can least afford either.
   *
   * Phone only, and opt-in. A desktop has room for the bar and uses it for the
   * crumb, the streak and the help menu, none of which the screen replaces.
   */
  bareOnMobile?: boolean;
}

export const DEFAULT_CHROME: Chrome = { sidebar: false, streakInTopBar: true };

interface ChromeContextValue {
  set: (next: Chrome) => void;
  /** Where <TopRight> puts its children. Null until the shell has mounted. */
  slot: HTMLElement | null;
}

const ChromeContext = React.createContext<ChromeContextValue | null>(null);

export const ChromeProvider = ChromeContext.Provider;

// Compared field by field, including inside `parent` — the caller passes a fresh
// object literal every render, so identity says nothing about whether it changed.
const same = (a: Chrome, b: Chrome) =>
  a.title === b.title && a.titleIcon === b.titleIcon
  && a.bareOnMobile === b.bareOnMobile
  && a.sidebar === b.sidebar && a.streakInTopBar === b.streakInTopBar
  && a.parent?.label === b.parent?.label && a.parent?.to === b.parent?.to
  && a.logo === b.logo;

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
  // Depended on as two primitives rather than as the object, which is new each render.
  const parentLabel = chrome.parent?.label;
  const parentTo = chrome.parent?.to;
  const logo = chrome.logo;
  const bareOnMobile = chrome.bareOnMobile;

  React.useLayoutEffect(() => {
    ctx?.set({
      title,
      titleIcon,
      sidebar,
      streakInTopBar,
      parent: parentLabel && parentTo ? { label: parentLabel, to: parentTo } : undefined,
      logo,
      bareOnMobile,
    });
  }, [ctx, title, titleIcon, sidebar, streakInTopBar, parentLabel, parentTo, logo, bareOnMobile]);
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
