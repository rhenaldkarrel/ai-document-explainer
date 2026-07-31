"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const subscribeNever = () => () => {};

/**
 * The persisted theme is only known after next-themes' inline script runs
 * pre-hydration — `useTheme()` reports `undefined` on the very first client
 * render. This flips from false (matching SSR) to true right after mount,
 * without the setState-in-effect pattern that trips the set-state-in-effect
 * lint rule.
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
    >
      {isDark ? <Moon aria-hidden /> : <Sun aria-hidden />}
      <span className="sr-only">Switch to {isDark ? "light" : "dark"} mode</span>
    </Button>
  );
}
