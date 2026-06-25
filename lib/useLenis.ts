"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./webgl";

/**
 * Smooth scroll (Lenis) wired into GSAP ScrollTrigger. Disabled for reduced
 * motion and coarse pointers (native scroll there). Registers ScrollTrigger
 * once and drives it from Lenis's RAF so pinned / scrubbed triggers stay in
 * sync with the eased scroll position. Everything is torn down on unmount so
 * navigating into the app leaves no ticker, listener, or trigger behind.
 */
export function useLenis() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion() || coarse) {
      // Native scroll; still refresh triggers once layout/fonts settle.
      const id = window.setTimeout(() => ScrollTrigger.refresh(), 200);
      return () => {
        clearTimeout(id);
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    }

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 200);

    return () => {
      clearTimeout(refresh);
      gsap.ticker.remove(ticker);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);
}
