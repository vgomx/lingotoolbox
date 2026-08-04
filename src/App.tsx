import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './marketing/Landing';
import { Home } from './tools/Home';
import { Settings } from './tools/Settings';
import { DeckList } from './tools/flashcards/DeckList';
import { DeckDetail } from './tools/flashcards/DeckDetail';
import { ReviewSession } from './tools/flashcards/ReviewSession';
import { ConjugationScreen, EtymologyScreen, GrammarScreen, PhrasebookScreen } from './tools/Placeholders';
import { useStore } from './state/store';

function Boot({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();
  // IndexedDB opens and seeds before the first paint of any product screen; the
  // marketing page doesn't wait on it.
  if (!ready) {
    return (
      <div
        style={{
          height: '100vh', display: 'grid', placeItems: 'center',
          background: 'var(--surface-app)', color: 'var(--text-faint)',
          fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-13)',
        }}
      >
        Loading your decks…
      </div>
    );
  }
  return <>{children}</>;
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
