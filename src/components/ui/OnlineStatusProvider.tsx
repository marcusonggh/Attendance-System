"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { WifiOff } from "lucide-react";

const OnlineStatusContext = createContext(true);

export function useOnlineStatus() {
  return useContext(OnlineStatusContext);
}

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  // Deliberately does not read navigator.onLine on mount: it's unreliable in
  // several real environments (corporate proxies/VPNs, some sandboxes) and
  // produces false "offline" readings. Only the online/offline events, which
  // fire on actual connectivity transitions, are trusted.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OnlineStatusContext.Provider value={isOnline}>
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-600 py-1.5 text-sm font-medium text-white">
          <WifiOff className="h-4 w-4" />
          You&apos;re offline — changes won&apos;t be saved until you&apos;re
          back online.
        </div>
      )}
      {children}
    </OnlineStatusContext.Provider>
  );
}
