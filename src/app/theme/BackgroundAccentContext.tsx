import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface BackgroundAccentContextType {
  accentColor: string | undefined;
  setAccentColor: (color: string | undefined) => void;
}

const BackgroundAccentContext = createContext<BackgroundAccentContextType | null>(null);

export function BackgroundAccentProvider({ children }: { children: ReactNode }) {
  const [accentColor, setAccentColorState] = useState<string | undefined>(undefined);

  // Stable setter that no-ops when the value is unchanged so consumers calling
  // `setAccentColor` from a useEffect don't trigger render loops.
  const setAccentColor = useCallback((color: string | undefined) => {
    setAccentColorState(prev => (prev === color ? prev : color));
  }, []);

  return (
    <BackgroundAccentContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </BackgroundAccentContext.Provider>
  );
}

export function useBackgroundAccent() {
  const ctx = useContext(BackgroundAccentContext);
  if (!ctx) throw new Error('useBackgroundAccent must be used within BackgroundAccentProvider');
  return ctx;
}
