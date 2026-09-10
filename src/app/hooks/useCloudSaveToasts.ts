import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isLauncherVersionAtLeast } from '../utils/launcherVersion';

/// Shape of the `lastEvent` field on `getCloudSaveStatus` (see
/// `cloud_saves::SyncEvent`). Absent on launchers older than the build that
/// added it, in which case this hook simply stays quiet.
interface CloudSyncEvent {
  seq: number;
  kind: 'pushed' | 'pulled';
  at: number;
}

interface CloudSaveStatus {
  enabled: boolean;
  syncing: boolean;
  error: string | null;
  lastEvent?: CloudSyncEvent | null;
}

/// Poll the running game's cloud-sync status and raise a toast whenever a sync
/// actually moves save data — an upload after the game closes, or a download
/// when the page is opened on a machine whose local save is behind.
///
/// Polls rather than being pushed to: the Rust side already exposes
/// `getCloudSaveStatus` as a pollable snapshot (the Save Manager panel drives
/// its status line off the same call), and syncs run on detached background
/// threads with no event channel back to the webview. The monotonic `seq`
/// makes this race-free — a tick that lands between two syncs collapses them
/// into one toast rather than replaying stale ones.
///
/// Only the *last* event is retained per game, and the seq is seeded on first
/// sight, so mounting mid-session never re-announces a sync the user already
/// saw.
export function useCloudSaveToasts(recompName: string | undefined) {
  const lastSeq = useRef<number | null>(null);
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    // Reset per game — seqs are global, but "already announced" is not a
    // meaningful claim to carry across a switch to a different game.
    lastSeq.current = null;
    lastError.current = null;

    if (!recompName) return;
    if (!isLauncherVersionAtLeast('1.6.1')) return;
    const w = window as any;
    if (typeof w.getCloudSaveStatus !== 'function') return;

    const poll = () => {
      let status: CloudSaveStatus | null = null;
      try {
        status = w.getCloudSaveStatus(recompName);
      } catch {
        return;
      }
      if (!status?.enabled) return;

      const event = status.lastEvent;
      if (event && typeof event.seq === 'number') {
        // First sighting only establishes the baseline — anything that
        // happened before this hook mounted is not news.
        if (lastSeq.current === null) {
          lastSeq.current = event.seq;
        } else if (event.seq > lastSeq.current) {
          lastSeq.current = event.seq;
          if (event.kind === 'pulled') {
            toast.success('Cloud save downloaded', {
              description: 'Your newer save from another device is now loaded. The save it replaced was kept as a backup.',
            });
          } else {
            toast.success('Cloud save updated', {
              description: 'Your latest progress has been backed up to Google Drive.',
            });
          }
        }
      }

      // Surface sync failures too — otherwise they're only visible to someone
      // who happens to have the Save Manager panel open.
      const error = status.error ?? null;
      if (error && error !== lastError.current) {
        toast.error('Cloud save sync failed', { description: error });
      }
      lastError.current = error;
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [recompName]);
}
