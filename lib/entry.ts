"use client";

import { useEffect, useState } from "react";

export const ENTERED_KEY = "planner-entered";
export const SEEN_INTRO_KEY = "planner-seen-intro";

export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SEEN_INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(SEEN_INTRO_KEY, "1");
  } catch {}
}

/**
 * Tracks whether the visitor has "opened the almanac". The entered flag lives
 * in localStorage so returning visitors skip the cinematic and land in the app.
 * Server + first client render assume NOT entered; the real value is read after
 * mount (so SSR is stable and we never flash the app then yank it away).
 */
export function useEntered() {
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setEntered(localStorage.getItem(ENTERED_KEY) === "1");
    } catch {}
    setMounted(true);
  }, []);

  const enter = () => {
    try {
      localStorage.setItem(ENTERED_KEY, "1");
    } catch {}
    setEntered(true);
  };

  const replay = () => {
    try {
      localStorage.removeItem(ENTERED_KEY);
      sessionStorage.removeItem(SEEN_INTRO_KEY);
    } catch {}
    setEntered(false);
  };

  return { entered, mounted, enter, replay };
}
