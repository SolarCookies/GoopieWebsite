import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const LOCAL_STORAGE_KEY = 'goopie_favorites_v1';

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/**
 * Per-user ordered favorites. When signed in, persists to Firestore at
 * `userFavorites/{uid}` with shape `{ gameIds: string[] }`. When signed out,
 * persists to localStorage. The list order is the user-controlled order.
 */
export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<string[]>(() => readLocal());
  const userIdRef = useRef<string | undefined>(userId);

  useEffect(() => {
    userIdRef.current = userId;

    if (!userId) {
      setFavorites(readLocal());
      return;
    }

    const ref = doc(db, 'userFavorites', userId);
    const unsub = onSnapshot(
      ref,
      snapshot => {
        const data = snapshot.data();
        const ids: string[] = Array.isArray(data?.gameIds)
          ? data!.gameIds.filter((x: unknown): x is string => typeof x === 'string')
          : [];
        setFavorites(ids);
      },
      () => { /* ignore (e.g. no firebase config) */ },
    );
    return unsub;
  }, [userId]);

  const persist = useCallback(async (next: string[]) => {
    setFavorites(next);
    const uid = userIdRef.current;
    if (uid) {
      try {
        await setDoc(doc(db, 'userFavorites', uid), { gameIds: next }, { merge: true });
      } catch {
        /* offline / no firebase — keep local state */
      }
    } else {
      writeLocal(next);
    }
  }, []);

  const isFavorite = useCallback((gameId: string) => favorites.includes(gameId), [favorites]);

  const toggleFavorite = useCallback(
    (gameId: string) => {
      const next = favorites.includes(gameId)
        ? favorites.filter(id => id !== gameId)
        : [...favorites, gameId];
      void persist(next);
    },
    [favorites, persist],
  );

  const reorderFavorites = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= favorites.length) return;
      if (toIndex < 0 || toIndex >= favorites.length) return;
      const next = favorites.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      void persist(next);
    },
    [favorites, persist],
  );

  const removeFavorite = useCallback(
    (gameId: string) => {
      if (!favorites.includes(gameId)) return;
      void persist(favorites.filter(id => id !== gameId));
    },
    [favorites, persist],
  );

  return { favorites, isFavorite, toggleFavorite, reorderFavorites, removeFavorite };
}
