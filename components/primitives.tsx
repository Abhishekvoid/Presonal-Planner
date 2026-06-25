"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useEffect, useRef } from "react";
import { Difficulty } from "@/lib/types";
import { spring } from "@/lib/motion";

/* ---------- Button ---------- */

type ButtonVariant = "solid" | "outline" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  variant = "outline",
  type = "button",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none select-none";
  const variants: Record<ButtonVariant, string> = {
    solid: "bg-espresso text-cream-raised hover:bg-olive-deep",
    outline: "border border-coffee/40 text-espresso hover:bg-espresso hover:text-cream-raised hover:border-espresso",
    ghost: "text-coffee hover:text-espresso hover:bg-cream-deep/60",
    danger: "border border-clay/50 text-clay-deep hover:bg-clay-deep hover:text-cream-raised hover:border-clay-deep",
  };
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={spring}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Progress bar ---------- */

export function ProgressBar({
  pct,
  color = "var(--olive)",
  height = 6,
}: {
  pct: number;
  color?: string;
  height?: number;
}) {
  return (
    <div className="w-full bg-cream-deep" style={{ height }}>
      <div className="grow-x" style={{ width: `${pct}%`, height, backgroundColor: color }} />
    </div>
  );
}

/* ---------- Difficulty chip ---------- */

const DIFF_STYLE: Record<Difficulty, string> = {
  easy: "border-olive/50 text-olive-deep",
  med: "border-coffee/50 text-coffee",
  hard: "border-clay/60 text-clay-deep",
};
const DIFF_LABEL: Record<Difficulty, string> = { easy: "easy", med: "med", hard: "hard" };

export function DifficultyChip({ d }: { d: Difficulty }) {
  return (
    <span className={`label !text-[9px] !tracking-[0.1em] border px-2 py-[2px] ${DIFF_STYLE[d]}`}>
      {DIFF_LABEL[d]}
    </span>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    // Move focus into the dialog
    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
    (focusables()[0] ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-scrim/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="relative w-full sm:max-w-lg bg-cream-raised border border-coffee/30 shadow-[0_24px_60px_-20px_rgba(42,33,27,0.5)] focus:outline-none"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between border-b hairline px-5 py-4">
              <h2 className="font-display text-lg font-bold tracking-tightest">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-coffee hover:text-espresso text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Field primitives for forms ---------- */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label text-coffee block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full bg-cream-base border border-coffee/30 px-3 py-2 text-sm text-espresso placeholder:text-coffee/70 focus:border-olive focus:outline-none transition-colors";
