/**
 * Shared motion vocabulary so every interaction shares one rhythm
 * (Disney "timing" + a consistent feel across the app). Tweak here, not
 * per-component.
 */
import type { Transition, Variants } from "framer-motion";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const spring: Transition = {
  type: "spring",
  stiffness: 460,
  damping: 30,
  mass: 0.7,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 22,
};

/** Press feedback: gentle anticipation lift on hover, squash on tap. */
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.96 },
  transition: spring,
} as const;

/** Cards: lift + settle. Pairs with a border-emphasis class for dark mode. */
export const hoverLift = {
  whileHover: { y: -3 },
  transition: springSoft,
} as const;

/** Staggered list/grid entrance. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};
