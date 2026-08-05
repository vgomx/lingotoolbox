import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Splash, SPLASH_EXIT_MS, SPLASH_MIN_MS, prefersReducedMotion } from './shell/Splash';
import { Landing } from './marketing/Landing';
import { Home } from './tools/Home';
import { Settings } from './tools/Settings';
import { DeckList } from './tools/flashcards/DeckList';
import { DeckDetail } from './tools/flashcards/DeckDetail';
import { ReviewSession } from './tools/flashcards/ReviewSession';
import { ConjugationScreen, EtymologyScreen, GrammarScreen, PhrasebookScreen } from './tools/Placeholders';
import { useStore } from './state/store';

/**
 * Holds the splash over the app until IndexedDB has opened and seeded.
 *
 * `ready` flips once for the whole session, so this is a page-load moment, not
 * something that replays as you move between tools. The children mount as soon
 * as they can and the splash fades off them, rather than the two swapping — so
 * the app is already painted by the time it is uncovered.
 */
function Boot({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();
  const reduced = React.useRef(prefersReducedMotion()).current;

  const [minElapsed, setMinElapsed] = React.useState(reduced);
  const [gone, setGone] = React.useState(false);

  React.useEffect(() => {
    if (reduced) return undefined;
    const t = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, [reduced]);

  const leaving = ready && minElapsed;

  React.useEffect(() => {
    if (!leaving) return undefined;
    // Unmount only after the fade, or the app would jump into place mid-exit.
    const t = setTimeout(() => setGone(true), reduced ? 0 : SPLASH_EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving, reduced]);

  return (
    <>
      {ready && children}
      {!gone && <Splash leaving={leaving} />}
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/app" element={<Boot><Home /></Boot>} />
      <Route path="/app/home" element={<Navigate to="/app" replace />} />
      <Route path="/app/cards" element={<Boot><DeckList /></Boot>} />
      <Route path="/app/cards/:deckId" element={<Boot><DeckDetail /></Boot>} />
      <Route path="/app/review" element={<Boot><ReviewSession /></Boot>} />
      <Route path="/app/review/:deckId" element={<Boot><ReviewSession /></Boot>} />
      <Route path="/app/etymology" element={<Boot><EtymologyScreen /></Boot>} />
      <Route path="/app/conjugation" element={<Boot><ConjugationScreen /></Boot>} />
      <Route path="/app/phrasebook" element={<Boot><PhrasebookScreen /></Boot>} />
      <Route path="/app/grammar" element={<Boot><GrammarScreen /></Boot>} />
      <Route path="/app/settings" element={<Boot><Settings /></Boot>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
