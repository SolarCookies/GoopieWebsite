import { useEffect, useRef } from 'react';

interface BackgroundAudioPlayerProps {
  videoId: string;
  audioKey: number;
  volume?: number; // 0–100, default 10
  muted?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
    _ytApiCallbacks: Array<() => void>;
  }
}

export function BackgroundAudioPlayer({ videoId, audioKey, volume = 10, muted = false }: BackgroundAudioPlayerProps) {
  // wrapperRef is owned by React; playerContainerRef is a child div we create
  // imperatively so the YT API can replace it without React noticing.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Toggle mute/unmute without re-mounting the player
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setVolume(muted ? 0 : volume);
    } catch { /* ignore */ }
  }, [muted, volume]);

  useEffect(() => {
    const createPlayer = () => {
      if (!wrapperRef.current) return;

      // Destroy previous player if any
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }

      // Clear wrapper and insert a fresh target div for the YT API to replace
      wrapperRef.current.innerHTML = '';
      const target = document.createElement('div');
      wrapperRef.current.appendChild(target);

      playerRef.current = new window.YT.Player(target, {
        videoId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: videoId,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(muted ? 0 : volume);
            e.target.playVideo();
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      if (!window._ytApiCallbacks) window._ytApiCallbacks = [];
      window._ytApiCallbacks.push(createPlayer);

      if (!document.getElementById('yt-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'yt-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
        window.onYouTubeIframeAPIReady = () => {
          (window._ytApiCallbacks || []).forEach(cb => cb());
          window._ytApiCallbacks = [];
        };
      }
    }

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
      // Clear the wrapper so React sees an empty div on unmount
      if (wrapperRef.current) wrapperRef.current.innerHTML = '';
    };
  }, [videoId, audioKey, volume]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}
    />
  );
}
