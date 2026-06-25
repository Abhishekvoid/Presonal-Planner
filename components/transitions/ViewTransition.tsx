"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Directional ink-shift between app views. Forward navigation slides the new
 * view in from the right; back navigation from the left. `mode="wait"` so the
 * outgoing view clears first (no overlap flash). Reduced motion is handled by
 * the page-level MotionConfig.
 */
export function ViewTransition({
  viewKey,
  direction,
  children,
}: {
  viewKey: string;
  direction: 1 | -1;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={viewKey}
        custom={direction}
        initial={{ opacity: 0, x: 24 * direction }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 * direction }}
        transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
