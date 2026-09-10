import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router, LAST_ROUTE_KEY, isResumableRoute } from './routes';
import { AuthProvider } from './auth/AuthContext';
import { GameStoreProvider } from './data/GameStore';
import { LauncherUpdateProvider } from './data/LauncherUpdateContext';
import { FocusedGameProvider } from './data/FocusedGameContext';
import { ThemeProvider } from './theme/ThemeContext';
import { BackgroundAccentProvider } from './theme/BackgroundAccentContext';
import { ThemeBackground } from './components/ThemeBackground';
import { FpsCounter } from './components/FpsCounter';
import { FileDropManager } from './components/FileDropManager';
import { Toaster } from './components/ui/sonner';

// Persist the current route on every navigation so the app can reopen on the
// last-viewed page next launch (see RootRoute in routes.tsx). Subscribes to
// the router directly rather than the `hashchange` DOM event: React Router's
// `navigate()` updates the URL via history.pushState/replaceState, which does
// NOT fire `hashchange` (that event only fires on direct `location.hash`
// writes or address-bar edits), so the old listener never saw in-app
// navigations and the stored route went stale after the very first load.
function useLastRoutePersistence() {
  useEffect(() => {
    const persist = (path: string) => {
      if (!isResumableRoute(path)) return;
      try {
        localStorage.setItem(LAST_ROUTE_KEY, path);
      } catch {
        /* ignore quota / privacy errors */
      }
    };
    persist(router.state.location.pathname + router.state.location.search);
    return router.subscribe(state => {
      persist(state.location.pathname + state.location.search);
    });
  }, []);
}

export default function App() {
  useLastRoutePersistence();
  return (
    <ThemeProvider>
      <BackgroundAccentProvider>
        <AuthProvider>
          <GameStoreProvider>
            <LauncherUpdateProvider>
              <FocusedGameProvider>
                <ThemeBackground />
                <RouterProvider router={router} />
                <FpsCounter />
                <FileDropManager />
                <Toaster />
              </FocusedGameProvider>
            </LauncherUpdateProvider>
          </GameStoreProvider>
        </AuthProvider>
      </BackgroundAccentProvider>
    </ThemeProvider>
  );
}