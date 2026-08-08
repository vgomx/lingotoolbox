import { exportAll, importAll, type ImportCounts } from './db';
import { APP_VERSION } from '../legalNotices';
import type { Card, Deck, Note, ReviewLogEntry } from './types';

/** Identifies the file as ours before anything reads its contents. */
export const BACKUP_FORMAT = 'lingo-toolbox/backup';

/**
 * Bumped only when an older file would be read wrongly by newer code — not for
 * additions. A reader that ignores fields it does not know can open a v1 file
 * forever; that is the point of writing the version down.
 */
/**
 * 2 added notes. A v1 file has no `notes` key at all, which is why the reader
 * treats it as optional rather than as a missing field — an old backup is still
 * a complete backup of everything the app had when it was written.
 */
export const BACKUP_VERSION = 2;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  app: string;
  decks: Deck[];
  cards: Card[];
  reviews: ReviewLogEntry[];
  notes: Note[];
}

/**
 * Everything in the database, in every workspace.
 *
 * Preferences are deliberately not in here. Theme, language and sound describe
 * the device you are sitting at, not the cards you have written — restoring a
 * backup on a laptop should not drag a phone's theme along with it.
 */
export async function buildBackup(now: number = Date.now()): Promise<Backup> {
  const { decks, cards, reviews, notes } = await exportAll();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now,
    app: APP_VERSION,
    decks,
    cards,
    reviews,
    notes,
  };
}

/** `lingo-toolbox-2026-08-05.json` — sorts chronologically in a folder. */
export function backupFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `lingo-toolbox-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Hands the file to the browser.
 *
 * A Blob and an object URL rather than a data: URI, because a large deck would
 * otherwise become a megabytes-long string in an href. The URL is revoked on the
 * next frame — immediately after `click()` is too early in Safari, which has not
 * finished reading it yet.
 */
export function downloadBackup(backup: Backup, filename = backupFilename()): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export class BackupError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const looksLikeNote = (v: unknown): boolean => isObject(v)
  && typeof v.id === 'string' && typeof v.language === 'string'
  && typeof v.title === 'string' && typeof v.body === 'string';

const looksLikeDeck = (v: unknown) => isObject(v)
  && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.language === 'string';

const looksLikeCard = (v: unknown) => isObject(v)
  && typeof v.id === 'string' && typeof v.deckId === 'string'
  && typeof v.front === 'string' && typeof v.back === 'string';

const looksLikeReview = (v: unknown) => isObject(v)
  && typeof v.id === 'string' && typeof v.cardId === 'string' && typeof v.reviewedAt === 'number';

/**
 * Reads a file and refuses anything it cannot vouch for.
 *
 * Deliberately strict at the edge. Everything past this point writes straight
 * into the database the reader's cards live in, so a malformed record is worth
 * rejecting loudly here rather than discovering later as a card with no front.
 * Errors say which check failed, because "invalid file" tells nobody anything.
 */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not JSON. Pick the .json file the export produced.');
  }

  if (!isObject(raw)) throw new BackupError('That file does not contain a backup.');
  if (raw.format !== BACKUP_FORMAT) {
    throw new BackupError('That is not a Lingo Toolbox backup — it may be an export from another app.');
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new BackupError(`That backup was written by a newer version of the app (format ${String(raw.version)}). Update and try again.`);
  }
  if (!Array.isArray(raw.decks) || !Array.isArray(raw.cards) || !Array.isArray(raw.reviews)) {
    throw new BackupError('That backup is missing its decks, cards or review history.');
  }
  if (!raw.decks.every(looksLikeDeck)) throw new BackupError('That backup has a deck with missing fields.');
  if (!raw.cards.every(looksLikeCard)) throw new BackupError('That backup has a card with missing fields.');
  if (!raw.reviews.every(looksLikeReview)) throw new BackupError('That backup has a review entry with missing fields.');
  // Absent in a v1 file, which is not an error — there were no notes to write.
  // Present but malformed is, so it is only checked when it is there.
  if (raw.notes !== undefined && (!Array.isArray(raw.notes) || !raw.notes.every(looksLikeNote))) {
    throw new BackupError('That backup has a note with missing fields.');
  }

  return {
    format: BACKUP_FORMAT,
    version: raw.version,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
    app: typeof raw.app === 'string' ? raw.app : 'unknown',
    decks: raw.decks as Deck[],
    cards: raw.cards as Card[],
    reviews: raw.reviews as ReviewLogEntry[],
    notes: (raw.notes ?? []) as Note[],
  };
}

export async function restoreBackup(backup: Backup): Promise<ImportCounts> {
  return importAll({ decks: backup.decks, cards: backup.cards, reviews: backup.reviews });
}

export type { ImportCounts };
