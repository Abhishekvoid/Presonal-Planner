"use client";

import { useEffect, useRef } from "react";

type View = "today" | "goals" | "progress" | "focus" | "notes";

const G_NAV: Record<string, View> = {
  t: "today",
  g: "goals",
  p: "progress",
  f: "focus",
  n: "notes",
};

function isTyping(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

/**
 * App-wide keyboard shortcuts:
 *   ⌘K / Ctrl+K  → command palette
 *   ?            → shortcuts overlay
 *   g then t/g/p/f/n → jump to a view (Vim/GitHub style)
 */
export function useGlobalShortcuts(opts: {
  openPalette: () => void;
  toggleShortcuts: () => void;
  changeView: (v: View) => void;
}) {
  const { openPalette, toggleShortcuts, changeView } = opts;
  const pendingG = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Command palette works even while typing.
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openPalette();
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        toggleShortcuts();
        return;
      }
      if (e.key === "g") {
        pendingG.current = Date.now();
        return;
      }
      const view = G_NAV[e.key.toLowerCase()];
      if (view && Date.now() - pendingG.current < 1200) {
        pendingG.current = 0;
        e.preventDefault();
        changeView(view);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette, toggleShortcuts, changeView]);
}
