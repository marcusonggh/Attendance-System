"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

// The actual theme isn't known until mounted on the client (the server
// can't know it) — this is `false` during SSR/hydration and `true` right
// after, without the extra render a useState+useEffect pair would cause.
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative h-7 w-14 flex-none rounded-full border transition-colors ${
        isDark ? "border-zinc-700 bg-zinc-800" : "border-zinc-300 bg-zinc-100"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-900 ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
        )}
      </span>
    </button>
  );
}
