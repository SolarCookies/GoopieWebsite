import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Game } from '../types/game';
import { games as defaultGames } from '../data/games';

interface GameStoreContextType {
  games: Game[];
  getGame: (id: string) => Game | undefined;
  saveGame: (game: Game) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
  getVisibleGames: (userRole: string | undefined, assignedGames: string[]) => Game[];
  uploadImage: (file: File, path: string) => Promise<string>;
}

const GameStoreContext = createContext<GameStoreContextType | null>(null);

const GAMES_COLLECTION = 'games';

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [firestoreGames, setFirestoreGames] = useState<Game[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Listen to Firestore games collection in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, GAMES_COLLECTION), (snapshot) => {
      const games = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Game));
      setFirestoreGames(games);
      setLoaded(true);
    }, () => {
      // On error (e.g. no Firebase config yet), fall back to defaults
      setLoaded(true);
    });
    return unsub;
  }, []);

  // Merge: Firestore games override defaults by ID, plus any Firestore-only games
  const games = (() => {
    if (!loaded) return defaultGames;
    const firestoreIds = new Set(firestoreGames.map(g => g.id));
    const merged = defaultGames.map(game => {
      const override = firestoreGames.find(g => g.id === game.id);
      return override ? { ...game, ...override } : { ...game, isPublic: game.isPublic ?? true };
    });
    const custom = firestoreGames.filter(g => !defaultGames.some(d => d.id === g.id));
    return [...merged, ...custom];
  })();

  const getGame = useCallback((id: string) => {
    return games.find(g => g.id === id);
  }, [games]);

  const saveGame = useCallback(async (game: Game) => {
    const cleaned = Object.fromEntries(
      Object.entries(game).filter(([, v]) => v !== undefined)
    );
    await setDoc(doc(db, GAMES_COLLECTION, game.id), cleaned);
  }, []);

  const deleteGame = useCallback(async (id: string) => {
    await deleteDoc(doc(db, GAMES_COLLECTION, id));
  }, []);

  const getVisibleGames = useCallback((userRole: string | undefined, assignedGames: string[]) => {
    return games.filter(game => {
      if (game.isPublic !== false) return true;
      if (userRole === 'admin') return true;
      if (userRole === 'developer' && assignedGames.includes(game.id)) return true;
      return false;
    });
  }, [games]);

  const uploadImage = useCallback(async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }, []);

  return (
    <GameStoreContext.Provider value={{ games, getGame, saveGame, deleteGame, getVisibleGames, uploadImage }}>
      {children}
    </GameStoreContext.Provider>
  );
}

export function useGameStore() {
  const ctx = useContext(GameStoreContext);
  if (!ctx) throw new Error('useGameStore must be used within GameStoreProvider');
  return ctx;
}
