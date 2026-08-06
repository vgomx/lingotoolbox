const KEY = 'lingo-toolbox:visited';

/**
 * Whether this browser has ever opened the app itself.
 *
 * Set on entering /app, not on seeing the landing page. The question worth
 * asking is "has this person used the thing?", not "have they been shown the
 * pitch?" — someone who bounced off the marketing page has not decided anything,
 * and skipping it for them would drop them into a workspace they never asked
 * for. Someone who has used it does not need selling to again.
 *
 * localStorage, so it survives the session; a returning visitor next week is the
 * whole case this exists for. Wrapped because private-mode Safari throws on
 * access rather than returning null, and the failure mode should be "show the
 * landing page", which is what a first-time visitor gets anyway.
 */
export function hasVisitedApp(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markAppVisited(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // A browser that will not store this simply keeps showing the landing page.
  }
}
