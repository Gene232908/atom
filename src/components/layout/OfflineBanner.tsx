import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-40 flex justify-center px-4">
      <p className="flex max-w-sm animate-pop items-center gap-2 rounded-full bg-warn px-4 py-2 text-xs font-semibold text-white shadow-lg sm:text-sm">
        <WifiOff className="size-4 shrink-0" />
        <span className="min-w-0">You are offline. Changes will be saved when you are back online.</span>
      </p>
    </div>
  );
}
