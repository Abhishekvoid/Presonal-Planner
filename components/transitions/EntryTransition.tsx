"use client";

import { useRef, useCallback } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/webgl";

/**
 * Spatial-continuity transition between the landing and the app. An ink-toned
 * overlay wipes down to cover the screen; at full cover the caller swaps the
 * landing for the app (so the change happens unseen); then the overlay wipes
 * away to reveal the app in place. GSAP owns the timeline (animation-lane
 * discipline). Reduced-motion → instant swap, no wipe.
 */
export function useEntryTransition() {
  const ref = useRef<HTMLDivElement>(null);

  const play = useCallback((atFullCover: () => void) => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) {
      atFullCover();
      return;
    }
    el.style.pointerEvents = "auto";
    gsap
      .timeline({
        onComplete: () => {
          el.style.pointerEvents = "none";
        },
      })
      .set(el, { clipPath: "inset(0 0 100% 0)", opacity: 1 })
      .to(el, { clipPath: "inset(0 0 0% 0)", duration: 0.5, ease: "power3.inOut" })
      .add(atFullCover)
      .to(el, { clipPath: "inset(100% 0 0 0)", duration: 0.5, ease: "power3.inOut" }, "+=0.05")
      .set(el, { opacity: 0 });
  }, []);

  const overlay = (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] bg-espresso opacity-0"
      style={{ clipPath: "inset(0 0 100% 0)" }}
    />
  );

  return { overlay, play };
}
