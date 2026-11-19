"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;
const REFRESHING_HEIGHT = 48;

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function subscribeStandalone(callback: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

// Once a PWA is installed (standalone display mode), the browser chrome —
// and with it the native pull-to-refresh gesture — is gone. This re-adds
// that gesture by hand; it's a no-op in an ordinary browser tab, which
// already has its own native pull-to-refresh.
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isStandalone = useSyncExternalStore(subscribeStandalone, isStandaloneDisplay, () => false);
  const [pull, setPull] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!isStandalone) return;

    function onTouchStart(e: TouchEvent) {
      if (refreshing || window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      // Resistance factor so the gesture feels like a drag, not 1:1 tracking.
      setPull(delta > 0 ? Math.min(delta * 0.5, MAX_PULL) : 0);
    }

    function onTouchEnd() {
      if (startY.current === null) return;
      startY.current = null;
      setIsDragging(false);
      setPull((current) => {
        if (current >= PULL_THRESHOLD) {
          setRefreshing(true);
          router.refresh();
          setTimeout(() => {
            setRefreshing(false);
            setPull(0);
          }, 600);
          return REFRESHING_HEIGHT;
        }
        return 0;
      });
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isStandalone, refreshing, router]);

  if (!isStandalone) return <>{children}</>;

  const progress = Math.min(pull / PULL_THRESHOLD, 1);

  return (
    <>
      <div
        className="flex items-center justify-center overflow-hidden text-zinc-400 dark:text-zinc-500"
        style={{
          height: pull,
          transition: isDragging ? "none" : "height 0.25s ease",
        }}
      >
        <RefreshCw
          className={refreshing ? "h-5 w-5 animate-spin" : "h-5 w-5"}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${progress * 360}deg)`, opacity: progress }
          }
        />
      </div>
      {children}
    </>
  );
}
