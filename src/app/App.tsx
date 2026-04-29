import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './auth/AuthContext';
import { GameStoreProvider } from './data/GameStore';
import { ThemeProvider } from './theme/ThemeContext';
import { BackgroundAccentProvider } from './theme/BackgroundAccentContext';
import { ThemeBackground } from './components/ThemeBackground';
import { FpsCounter } from './components/FpsCounter';

export default function App() {
  return (
    <ThemeProvider>
      <BackgroundAccentProvider>
        <AuthProvider>
          <GameStoreProvider>
            <ThemeBackground />
            <RouterProvider router={router} />
            <FpsCounter />
          </GameStoreProvider>
        </AuthProvider>
      </BackgroundAccentProvider>
    </ThemeProvider>
  );
}