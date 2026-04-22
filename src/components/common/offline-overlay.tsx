import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

function SpinnerDots() {
  return (
    <div className="flex items-center gap-2 mt-3" aria-hidden="true">
      <span className="size-2 rounded-full bg-[#0061e0] animate-bounce [animation-delay:-0.2s]" />
      <span className="size-2 rounded-full bg-[#0061e0] animate-bounce [animation-delay:-0.1s]" />
      <span className="size-2 rounded-full bg-[#0061e0] animate-bounce" />
    </div>
  );
}

export function OfflineOverlay() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#dbe2ea] bg-white shadow-xl p-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[#e8f0fb]">
          <WifiOff className="size-7 text-[#0061e0]" />
        </div>
        <h2 className="text-[20px] font-extrabold text-black">No internet connection</h2>
        <p className="mt-2 text-[14px] text-[#5b6470]">
          Please check your network and try again.
        </p>
        <div className="flex items-center justify-center">
          <SpinnerDots />
        </div>
      </div>
    </div>
  );
}
