import { useEffect, useState } from 'react';

/**
 * Turns false when the app has been in the background for a while.
 * Live updates are paused then, so a forgotten open tab does not keep
 * using the Firebase free daily limit. When the user comes back,
 * live updates start again and only changed data is downloaded.
 */
export function usePageActive(pauseAfterMs = 90_000): boolean {
  const [active, setActive] = useState(() => document.visibilityState !== 'hidden');

  useEffect(() => {
    let timer: number | undefined;
    const onChange = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === 'hidden') {
        timer = window.setTimeout(() => setActive(false), pauseAfterMs);
      } else {
        setActive(true);
      }
    };
    document.addEventListener('visibilitychange', onChange);
    return () => {
      document.removeEventListener('visibilitychange', onChange);
      window.clearTimeout(timer);
    };
  }, [pauseAfterMs]);

  return active;
}
