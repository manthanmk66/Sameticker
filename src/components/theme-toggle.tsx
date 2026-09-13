"use client";

import { Moon, Sun } from "lucide-react";
import { useModeAnimation, ThemeAnimationType } from "react-theme-switch-animation";

/**
 * Light / dark toggle. The reveal sweeps diagonally, so the change reads as
 * the page being re-lit rather than repainted.
 *
 * The icons swap via the `dark:` variant reading the class on <html>, not via
 * the hook's `isDarkMode`. That state is seeded from localStorage, which the
 * server cannot know, so rendering from it would hydrate mismatched. The class
 * is already correct before first paint — see the script in layout.tsx.
 */
export function ThemeToggle() {
  const { ref, toggleSwitchTheme } = useModeAnimation({
    animationType: ThemeAnimationType.POLYGON_GRADIENT,
    duration: 700,
    globalClassName: "dark",
  });

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggleSwitchTheme}
      aria-label="Switch between light and dark theme"
      title="Light / dark"
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center border border-rule text-muted-foreground transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-rule-2 hover:text-ink active:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <Moon size={14} className="dark:hidden" aria-hidden="true" />
      <Sun size={14} className="hidden dark:block" aria-hidden="true" />
    </button>
  );
}
