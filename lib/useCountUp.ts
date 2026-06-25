"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "./webgl";

/**
 * Tweens a displayed integer toward `value` with GSAP (eased, not linear),
 * so headline metrics count up rather than snapping. Honors reduced-motion.
 */
export function useCountUp(value: number, duration = 0.9): number {
  const [display, setDisplay] = useState(value);
  const proxy = useRef({ n: value });

  useEffect(() => {
    if (prefersReducedMotion()) {
      proxy.current.n = value;
      setDisplay(value);
      return;
    }
    const tween = gsap.to(proxy.current, {
      n: value,
      duration,
      ease: "power2.out",
      onUpdate: () => setDisplay(Math.round(proxy.current.n)),
    });
    return () => {
      tween.kill();
    };
  }, [value, duration]);

  return display;
}
