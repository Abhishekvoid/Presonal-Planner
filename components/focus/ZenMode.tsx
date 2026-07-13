"use client";

/**
 * Fullscreen "zen" focus space. Everything fades away into a calm dimmed room
 * with just the clock, the breathing ring, and the current task. Shares the same
 * timer state as the card (values are passed in and update each tick). Esc exits.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { TimerMode } from "@/lib/types";
import { ProgressRing } from "./ProgressRing";

const ZEN_COLOR: Record<TimerMode, string> = {
  work: "#A7B26A",
  break: "#D9A45F",
  flow: "#66C7C7",
};

interface Controls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  endFlow: () => void;
}

export function ZenMode({
  open,
  onClose,
  display,
  progress,
  mode,
  isFlow,
  running,
  paused,
  hasTimer,
  taskLabel,
  controls,
}: {
  open: boolean;
  onClose: () => void;
  display: string;
  progress: number;
  mode: TimerMode;
  isFlow: boolean;
  running: boolean;
  paused: boolean;
  hasTimer: boolean;
  taskLabel?: string | null;
  controls: Controls;
}) {
  // Portal to <body> so `fixed` escapes any transformed ancestor (ViewTransition).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const accent = ZEN_COLOR[mode] ?? ZEN_COLOR.work;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-0 bg-[#0a0c09]" />
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 38%, ${accent}22, transparent 62%)` }}
            animate={running ? { opacity: [0.65, 1, 0.65] } : { opacity: 0.7 }}
            transition={running ? { duration: 4.2, ease: "easeInOut", repeat: Infinity } : { duration: 0.4 }}
          />

          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-white/80"
          >
            Exit · esc
          </button>

          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
            className="relative flex flex-col items-center"
          >
            <ProgressRing
              progress={progress}
              mode={mode}
              running={running}
              isFlow={isFlow}
              size={360}
              stroke={4}
              color={accent}
              trackColor="#ffffff"
              trackOpacity={0.1}
            >
              <div className="font-display text-[5.5rem] leading-none font-extrabold tracking-tightest tabular-nums text-white/95 sm:text-[6.5rem]">
                {display}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${running ? "animate-pulse" : ""}`} style={{ background: accent }} />
                <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                  {isFlow ? "Flow" : mode === "work" ? "Focus" : "Break"}{paused ? " · paused" : ""}
                </span>
              </div>
            </ProgressRing>

            {taskLabel && (
              <div className="mt-7 max-w-md text-center text-[13px] leading-relaxed text-white/60">{taskLabel}</div>
            )}

            <div className="mt-9 flex items-center gap-2.5">
              {!hasTimer && <ZenButton primary accent={accent} onClick={controls.start}>Start focus</ZenButton>}
              {running && <ZenButton accent={accent} onClick={controls.pause}>Pause</ZenButton>}
              {paused && <ZenButton primary accent={accent} onClick={controls.resume}>Resume</ZenButton>}
              {hasTimer && isFlow && <ZenButton accent={accent} onClick={controls.endFlow}>End flow</ZenButton>}
              {hasTimer && !isFlow && <ZenButton accent={accent} onClick={controls.reset}>Reset</ZenButton>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ZenButton({
  children,
  onClick,
  primary,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  accent: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      className={`rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${
        primary ? "text-[#0a0c09]" : "border border-white/15 text-white/70 hover:border-white/35 hover:text-white"
      }`}
      style={primary ? { background: accent } : undefined}
    >
      {children}
    </motion.button>
  );
}
