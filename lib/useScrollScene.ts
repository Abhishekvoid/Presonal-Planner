"use client";

import { RefObject, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./webgl";

/**
 * Binds a scrubbed ScrollTrigger over `targetRef` to a callback, so scroll
 * progress (0..1) can drive a three.js uniform. Reduced motion / coarse
 * pointer → no scrub; the callback is called once with a representative mid
 * value so the scene renders a sensible static frame. Fully torn down on
 * unmount.
 */
export function useScrollScene(
  targetRef: RefObject<HTMLElement>,
  onProgress: (p: number) => void,
) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion() || coarse) {
      onProgress(0.5);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => onProgress(self.progress),
    });
    return () => st.kill();
    // onProgress is expected to be stable (a ref setter); deps intentionally
    // limited to the element identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRef]);
}
