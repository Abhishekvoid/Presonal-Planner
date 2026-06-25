"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "planner-theme";

/**
 * Inline script injected before paint (see app/layout.tsx) to prevent a
 * flash of the wrong theme. Kept here as the single source of truth for the
 * storage key + resolution order (stored choice → system preference).
 */
export const themeBootstrapScript = `
(function () {
  try {
    var k = ${JSON.stringify(THEME_KEY)};
    var s = localStorage.getItem(k);
    var dark = s === "dark" || (s === null &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export function useTheme() {
  // Server + first client render assume light; the real value is read from the
  // DOM class (set by the bootstrap script) once mounted, avoiding any flash.
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
    setMounted(true);
  }, []);

  const setTheme = (next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    setThemeState(next);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle, mounted };
}
