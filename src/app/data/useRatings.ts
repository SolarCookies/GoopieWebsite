import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface GameRatingInfo {
  averageRating: number;
  totalRatings: number;
}

export function useRatings(userId: string | undefined) {
  const [gameRatings, setGameRatings] = useState<Record<string, GameRatingInfo>>({});
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  // Listen to top-level ratings collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ratings'), (snapshot) => {
      const agg: Record<string, { sum: number; count: number }> = {};
      const myRatings: Record<string, number> = {};

      snapshot.docs.forEach(d => {
        const data = d.data();
        const gameId = data.gameId;
        const ratingUserId = data.userId;
        if (!gameId || typeof data.stars !== 'number') return;

        if (!agg[gameId]) {
          agg[gameId] = { sum: 0, count: 0 };
        }
        agg[gameId].sum += data.stars;
        agg[gameId].count += 1;

        if (userId && ratingUserId === userId) {
          myRatings[gameId] = data.stars;
        }
      });

      const computed: Record<string, GameRatingInfo> = {};
      for (const [gameId, { sum, count }] of Object.entries(agg)) {
        computed[gameId] = {
          averageRating: sum / count,
          totalRatings: count,
        };
      }

      setGameRatings(computed);
      setUserRatings(myRatings);
    }, () => {
      // On error (e.g. no Firebase config), silently ignore
    });

    return unsub;
  }, [userId]);

  const rateGame = useCallback(async (gameId: string, stars: number) => {
    if (!userId) return;
    const ratingRef = doc(db, 'ratings', `${gameId}_${userId}`);
    if (stars <= 0) {
      await deleteDoc(ratingRef);
      return;
    }
    await setDoc(ratingRef, { gameId, userId, stars });
  }, [userId]);

  return { gameRatings, userRatings, rateGame };
}
