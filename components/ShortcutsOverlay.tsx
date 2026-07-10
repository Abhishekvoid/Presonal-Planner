"use client";

/**
 * Keyboard shortcuts overlay (opened with "?"). A quick reference card that
 * springs in over a dimmed backdrop. Controlled by Planner.
 */

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

const GROUPS: { title: string; rows: { keys: string[]; label: string }[] }[] = [
  {
    title: "Navigate",
    rows: [
      { keys: ["g", "t"], label: "Today" },
      { keys: ["g", "g"], label: "Goals" },
      { keys: ["g", "p"], label: "Progress" },
      { keys: ["g", "f"], label: "Focus" },
      { keys: ["g", "n"], label: "Notes" },
    ],
  },
  {
    title: "Commands",
    rows: [
      { keys: ["⌘", "K"], label: "Command palette" },
      { keys: ["?"], label: "This overlay" },
      { keys: ["esc"], label: "Close / dismiss" },
    ],
  },
];

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div className="absolute inset-0 bg-scrim/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 440, damping: 32, mass: 0.8 }}
            className="relative w-full max-w-[440px] rounded-xl border border-coffee/25 bg-cream-raised/95 p-5 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold tracking-tight text-espresso">Keyboard shortcuts</h2>
              <button onClick={onClose} className="text-[11px] font-medium text-coffee hover:text-espresso">Close</button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-coffee-soft">{g.title}</div>
                  <div className="space-y-1.5">
                    {g.rows.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3">
                        <span className="text-[12.5px] text-espresso">{r.label}</span>
                        <span className="flex items-center gap-1">
                          {r.keys.map((k, i) => (
                            <kbd key={i} className="min-w-[20px] rounded border border-coffee/25 bg-cream-base px-1.5 py-0.5 text-center font-mono text-[10px] text-coffee">{k}</kbd>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
