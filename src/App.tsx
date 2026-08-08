import * as React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { UpdatePrompt } from './shell/UpdatePrompt';
import { Splash, SPLASH_EXIT_MS, SPLASH_MIN_MS, prefersReducedMotion } from './shell/Splash';
import { Landing } from './marketing/Landing';
import { Home } from './tools/Home';
import { GrammarNotes } from './tools/grammar/GrammarNotes';
import { Settings } from './tools/Settings';
import { DeckList } from './tools/flashcards/DeckList';
import { DeckDetail } from './tools/flashcards/DeckDetail';
import { ReviewSession } from './tools/flashcards/ReviewSession';
import { ConjugationScreen, EtymologyScreen, PhrasebookScreen } from './tools/Placeholders';
import { useStore } from './state/store';
import { hasVisitedApp } from './data/visit';

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

/**
 * What `/` does, which depends on who is arriving.
 *
 * A first-time visitor gets the marketing page. Someone who has used the app
 * before gets the app — they have already read the pitch, and making them click
 * past it every time is a toll on the people who liked it enough to come back.
 *
 * The redirect fires only on a cold arrival. React Router gives the initial
 * entry the key `default` and generates one for every navigation after it, which
 * is exactly the distinction that matters here: *arriving* at the site is the
 * case to shortcut, while *clicking* the marketing link from inside the app is a
 * deliberate request for this page and must be honoured. Both in-app routes back
 * to `/` — the rail logo and the About button — depend on that.
 */
function Entry() {
  const location = useLocation();
  const coldArrival = location.key === 'default';
  if (coldArrival && hasVisitedApp()) return <Navigate to="/app" replace />;
  return <Landing />;
}

/** An unknown URL lands wherever `/` would have sent this person anyway. */
function NotFound() {
  return <Navigate to={hasVisitedApp() ? '/app' : '/'} replace />;
}

export function App() {
  return (
    <>
      {/* Outside the routes, so a deploy landing while you are three screens
          deep is still noticed — and so the prompt is not unmounted by the
          navigation someone makes while ignoring it. */}
      <UpdatePrompt />

      <Routes>
        <Route path="/" element={<Entry />} />

        {/* One shell for every screen under /app. As a layout route it stays
            mounted across navigations, so the rail can animate and the deck list
            keeps its scroll — neither of which was possible when each screen
            rendered its own copy. */}
        <Route path="/app" element={<Boot><AppShell /></Boot>}>
          <Route index element={<Home />} />
          <Route path="home" element={<Navigate to="/app" replace />} />
          <Route path="cards" element={<DeckList />} />
          <Route path="cards/:deckId" element={<DeckDetail />} />
          <Route path="review" element={<ReviewSession />} />
          <Route path="review/:deckId" element={<ReviewSession />} />
          <Route path="etymology" element={<EtymologyScreen />} />
          <Route path="conjugation" element={<ConjugationScreen />} />
          <Route path="phrasebook" element={<PhrasebookScreen />} />
          <Route path="grammar" element={<GrammarNotes />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
