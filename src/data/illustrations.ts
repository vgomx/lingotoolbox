import type { IllustrationItem } from 'lingo-ds';
import type { Illustration } from './types';
import { ILLUSTRATIONS, ILLUSTRATION_GROUPS, OPENMOJI_VERSION } from './openmojiCatalog';

export { ILLUSTRATION_GROUPS, OPENMOJI_VERSION };

const BY_HEX = new Map(ILLUSTRATIONS.map((i) => [i.hex, i]));

/**
 * Where the vendored glyphs are served from.
 *
 * BASE_URL, not a leading slash: GitHub Pages serves the app from /lingotoolbox/,
 * and an absolute path would look for the set at the domain root.
 */
export const ILLUSTRATION_BASE = `${import.meta.env.BASE_URL}openmoji/`;

export function findIllustration(hex: string | undefined): Illustration | undefined {
  return hex ? BY_HEX.get(hex) : undefined;
}

/**
 * URL for a stored hex, or undefined if the glyph is not in the vendored set.
 *
 * A card stores the codepoint rather than the filename so that renaming a file —
 * or OpenMoji revising an annotation — cannot orphan somebody's card.
 */
export function illustrationUrl(hex: string | undefined): string | undefined {
  const found = findIllustration(hex);
  return found && `${ILLUSTRATION_BASE}${found.file}`;
}

/** The catalogue in the shape lingo-ds's IllustrationPicker takes. */
export const ILLUSTRATION_ITEMS: IllustrationItem[] = ILLUSTRATIONS.map((i) => ({
  id: i.hex,
  src: `${ILLUSTRATION_BASE}${i.file}`,
  name: i.name,
  group: i.group,
  keywords: i.keywords,
}));
