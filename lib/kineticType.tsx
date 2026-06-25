"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { EASE_OUT_EXPO } from "./motion";
import { useCountUp } from "./useCountUp";

/**
 * Letterpress press-in: the heading drops and sharpens onto the page as if
 * stamped. Framer honors reduced motion via the page-level MotionConfig
 * (reducedMotion="user"), so we don't branch here.
 */
export function PressIn({
  children,
  as = "span",
  className = "",
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "span";
  className?: string;
}) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: -8, scale: 1.05, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Big metric numeral: counts up (eased) and breathes wider on the `wdth` axis
 * once on mount. Reduced motion is handled inside useCountUp (snaps); the width
 * animation also resolves to its final state under MotionConfig.
 */
export function KineticNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const display = useCountUp(value);
  return (
    <motion.span
      className={className}
      initial={{ fontVariationSettings: '"wdth" 100' }}
      animate={{ fontVariationSettings: '"wdth" 125' }}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
    >
      {display}
    </motion.span>
  );
}
