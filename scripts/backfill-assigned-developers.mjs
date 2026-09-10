/**
 * One-time migration: populates games/{gameId}.assignedDevelopers from the
 * existing users/{uid}.assignedGames data, so the "Recompiled By" section
 * and the editor's "Assigned Developer Accounts" panel show developers that
 * were assigned before assignedDevelopers was introduced (see
 * src/app/auth/AuthContext.tsx's assignGame/unassignGame, which keep the two
 * in sync going forward).
 *
 * Usage:
 *   1. Auth: `gcloud auth application-default login`, or set
 *      GOOGLE_APPLICATION_CREDENTIALS to a service account key with
 *      Firestore access for this project.
 *   2. node scripts/backfill-assigned-developers.mjs [--project <id>] [--dry-run]
 *
 * Safe to re-run: it recomputes assignedDevelopers from scratch each time
 * based on current assignedGames, it doesn't append/accumulate.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const projectArgIndex = args.indexOf('--project');
const projectId = projectArgIndex !== -1 ? args[projectArgIndex + 1] : undefined;

initializeApp({ credential: applicationDefault(), ...(projectId ? { projectId } : {}) });
const db = getFirestore();

const usersSnap = await db.collection('users').get();

/** @type {Map<string, {uid: string, username: string, picture?: string}[]>} */
const devsByGame = new Map();

for (const userDoc of usersSnap.docs) {
  const data = userDoc.data();
  const assignedGames = Array.isArray(data.assignedGames) ? data.assignedGames : [];
  if (assignedGames.length === 0) continue;

  const dev = {
    uid: userDoc.id,
    username: data.username ?? '',
    ...(data.picture ? { picture: data.picture } : {}),
  };

  for (const gameId of assignedGames) {
    if (!devsByGame.has(gameId)) devsByGame.set(gameId, []);
    devsByGame.get(gameId).push(dev);
  }
}

console.log(`Found ${devsByGame.size} game(s) with assigned developers across ${usersSnap.size} user(s).`);

const gamesSnap = await db.collection('games').get();
let updated = 0;
let skippedMissing = 0;

for (const [gameId, devs] of devsByGame) {
  const gameDoc = gamesSnap.docs.find(d => d.id === gameId);
  if (!gameDoc) {
    console.warn(`  ! users reference game "${gameId}" which no longer exists — skipping`);
    skippedMissing++;
    continue;
  }

  const current = gameDoc.data().assignedDevelopers ?? [];
  const currentUids = new Set(current.map(d => d.uid));
  const nextUids = new Set(devs.map(d => d.uid));
  const unchanged = current.length === devs.length && [...currentUids].every(uid => nextUids.has(uid));

  if (unchanged) continue;

  console.log(`  - ${gameDoc.data().title ?? gameId}: ${devs.map(d => d.username).join(', ')}`);
  if (!dryRun) {
    await gameDoc.ref.update({ assignedDevelopers: devs });
  }
  updated++;
}

console.log(
  `${dryRun ? '[dry run] would update' : 'Updated'} ${updated} game(s).` +
    (skippedMissing ? ` ${skippedMissing} referenced a missing game doc.` : ''),
);
