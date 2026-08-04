import { Button, Icon } from 'lingo-ds';
import { Link } from 'react-router-dom';
import { AppShell } from '../shell/AppShell';
import { EmptyTool } from './EmptyTool';

/**
 * The four tools beyond Flashcards are designed but not built yet. Each gets a
 * real empty state rather than a dead route, and points at the tool that works.
 */

const toFlashcards = (
  <Link to="/app/cards" style={{ textDecoration: 'none' }}>
    <Button variant="secondary" iconLeft={<Icon name="layers" size={16} />}>Open Flashcards</Button>
  </Link>
);

export function EtymologyScreen() {
  return (
    <AppShell title="Etymology Explorer" titleIcon="git-branch">
      <EmptyTool
        icon="git-branch"
        accent="var(--tool-etymology)"
        title="Not built yet"
        description="Word-origin chains are designed but not wired up. Flashcards is the tool that works today."
        action={toFlashcards}
      />
    </AppShell>
  );
}

export function ConjugationScreen() {
  return (
    <AppShell title="Conjugation Drill" titleIcon="spell-check">
      <EmptyTool
        icon="spell-check"
        accent="var(--tool-conjugation)"
        title="Not built yet"
        description="Verb drills need a conjugation table per language. Flashcards is the tool that works today."
        action={toFlashcards}
      />
    </AppShell>
  );
}

export function PhrasebookScreen() {
  return (
    <AppShell title="Phrasebook" titleIcon="message-square-quote">
      <EmptyTool
        icon="message-square-quote"
        accent="var(--tool-phrasebook)"
        title="Not built yet"
        description="Saved phrases will share the deck your cards already live in. Flashcards is the tool that works today."
        action={toFlashcards}
      />
    </AppShell>
  );
}

export function GrammarScreen() {
  return (
    <AppShell title="Grammar Notes" titleIcon="scroll-text">
      <EmptyTool
        icon="scroll-text"
        accent="var(--tool-grammar)"
        title="Not built yet"
        description="Short explanations you can pull up mid-review. Flashcards is the tool that works today."
        action={toFlashcards}
      />
    </AppShell>
  );
}
