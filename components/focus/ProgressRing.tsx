"use client";

/**
 * A single clean progress arc that fills as a focus session elapses and gently
 * "breathes" (scale + opacity) while running. Colour follows the timer mode.
 * Flow mode (counts up, no end) shows a calm full ring. The clock sits inside
 * as children.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import type { TimerMode } from "@/lib/types";

const MODE_COLOR: Record<TimerMode, string> = {
  work: "var(--olive)",
  break: "var(--clay)",
  flow: "var(--flow)",
};

export function ProgressRing({
  progress,
  mode,
  running,
  isFlow = false,
  size = 240,
  stroke = 7,
  color,
  trackColor = "var(--coffee)",
  trackOpacity = 0.14,
  children,
}: {
  progress: number;
  mode: TimerMode;
  running: boolean;
  isFlow?: boolean;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  trackOpacity?: number;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const strokeColor = color ?? MODE_COLOR[mode] ?? "var(--olive)";
  const pct = isFlow ? 1 : Math.max(0, Math.min(1, progress));
  const offset = circ * (1 - pct);
  const breathing = running && !reduce;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0"
        animate={breathing ? { scale: [1, 1.025, 1], opacity: [0.92, 1, 0.92] } : { scale: 1, opacity: 1 }}
        transition={breathing ? { duration: 4.2, ease: "easeInOut", repeat: Infinity } : { duration: 0.3 }}
      >
        <svg width={size} height={size} className="block -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeOpacity={trackOpacity} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={isFlow ? 0 : offset}
            opacity={isFlow ? 0.32 : 1}
            style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
      </motion.div>
      <div className="relative z-10 grid place-items-center text-center">{children}</div>
    </div>
  );
}
