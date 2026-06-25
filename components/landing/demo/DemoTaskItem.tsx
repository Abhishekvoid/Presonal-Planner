"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { DifficultyChip } from "@/components/primitives";
import { EASE_OUT_EXPO, spring } from "@/lib/motion";
import { Difficulty } from "@/lib/types";

/**
 * A demo task row for the landing's "Days hold Tasks" act. Mirrors TaskItem's
 * look and completion celebration but is entirely self-contained (local state)
 * so it never imports or mutates the real planner store. `autoCheck` ticks it
 * once when scrolled into view; it stays clickable either way.
 */
export function DemoTaskItem({
  text,
  difficulty,
  autoCheck = false,
  delay = 0,
}: {
  text: string;
  difficulty?: Difficulty;
  autoCheck?: boolean;
  /** seconds to wait after entering view before auto-checking (stagger) */
  delay?: number;
}) {
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });

  useEffect(() => {
    if (!autoCheck || !inView) return;
    const id = window.setTimeout(() => {
      setDone((d) => {
        if (!d) setBurst((b) => b + 1);
        return true;
      });
    }, delay * 1000);
    return () => clearTimeout(id);
  }, [autoCheck, inView, delay]);

  const toggle = () => {
    setDone((d) => {
      if (!d) setBurst((b) => b + 1);
      return !d;
    });
  };

  return (
    <div ref={ref} className="flex items-start gap-3 border-b hairline py-2.5 last:border-b-0">
      <motion.button
        onClick={toggle}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        whileTap={{ scale: 0.82 }}
        transition={spring}
        className={`relative mt-[2px] h-[18px] w-[18px] shrink-0 border transition-colors duration-200 ${
          done ? "border-olive bg-olive" : "border-coffee/50 bg-cream-base hover:border-espresso"
        }`}
      >
        <AnimatePresence>
          {burst > 0 && (
            <motion.span
              key={burst}
              aria-hidden
              className="pointer-events-none absolute -inset-[3px] border border-olive"
              initial={{ scale: 0.5, opacity: 0.75 }}
              animate={{ scale: 2.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        {done && (
          <motion.svg
            viewBox="0 0 18 18"
            initial={{ pathLength: 0, opacity: 0, scale: 0.7 }}
            animate={{ pathLength: 1, opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
            className="absolute inset-0"
          >
            <motion.path
              d="M4 9.5 L7.5 13 L14 5"
              fill="none"
              stroke="var(--cream-raised)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </motion.button>

      <button onClick={toggle} className="min-w-0 flex-1 text-left" aria-hidden tabIndex={-1}>
        <span
          className={`relative inline text-[13.5px] leading-relaxed transition-colors duration-300 ${
            done ? "text-coffee/55" : "text-espresso"
          }`}
        >
          {text}
          <motion.span
            aria-hidden
            className="absolute left-0 top-1/2 h-px origin-left bg-coffee/55"
            initial={false}
            animate={{ scaleX: done ? 1 : 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%" }}
          />
        </span>
      </button>

      {difficulty && (
        <div className="shrink-0">
          <DifficultyChip d={difficulty} />
        </div>
      )}
    </div>
  );
}
