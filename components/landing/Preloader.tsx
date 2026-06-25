"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { prefersReducedMotion } from "@/lib/webgl";
import { EASE_OUT_EXPO } from "@/lib/motion";

const InkReveal = dynamic(() => import("@/components/webgl/InkReveal"), { ssr: false });

const DURATION_MS = 1800;
const HARD_TIMEOUT_MS = 3000;

/**
 * First-visit entry. A 0→100 counter rises while ink bleeds into the paper and
 * the wordmark sharpens out of blur; on completion it calls `onDone` once. The
 * caller (LandingExperience) decides whether to show this at all (first session
 * only). Reduced-motion → a quick fade. A hard timeout guarantees we never trap
 * the visitor on the loader.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const done = useRef(false);
  const finish = useRef(onDone);
  finish.current = onDone;

  useEffect(() => {
    const complete = () => {
      if (done.current) return;
      done.current = true;
      finish.current();
    };

    const reduced = prefersReducedMotion();
    const hard = window.setTimeout(complete, HARD_TIMEOUT_MS);

    if (reduced) {
      setCount(100);
      const t = window.setTimeout(complete, 350);
      return () => {
        clearTimeout(t);
        clearTimeout(hard);
      };
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION_MS, 1);
      // ease-out so it decelerates into 100
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        window.setTimeout(complete, 280); // hold the full mark briefly
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hard);
    };
  }, []);

  const progress = count / 100;

  return (
    <motion.div
      className="fixed inset-0 z-[60] grid place-items-center bg-cream-base"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      <InkReveal progress={progress} className="absolute inset-0" />
      <div className="relative flex flex-col items-center gap-6">
        <span
          className="font-display text-[clamp(2.5rem,9vw,6rem)] font-extrabold tracking-tightest text-espresso"
          style={{
            filter: `blur(${(1 - progress) * 10}px)`,
            opacity: 0.25 + progress * 0.75,
            fontVariationSettings: `"wdth" ${100 + progress * 25}`,
          }}
        >
          ALMANAC
        </span>
        <span className="font-display text-sm tabular-nums tracking-tightest text-coffee">
          {String(count).padStart(3, "0")}
        </span>
      </div>
    </motion.div>
  );
}
