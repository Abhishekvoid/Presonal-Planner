"use client";

/**
 * DockNav — a macOS-style navigation dock pinned to the bottom.
 *
 * At rest it shows a slim peek handle. When the cursor nears the bottom edge
 * (or the handle is hovered/focused) the full dock springs up. Items magnify by
 * cursor proximity like the macOS dock. On touch / reduced-motion the dock is
 * simply always visible with magnification disabled.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import {
  CalendarCheck,
  Target,
  ChartLineUp,
  Timer,
  NotePencil,
  PaperPlaneTilt,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

type View = "today" | "goals" | "progress" | "focus" | "notes";

interface Entry {
  id: string;
  label: string;
  Icon: PhosphorIcon;
  view?: View;
  href?: string;
}

const ENTRIES: Entry[] = [
  { id: "today", label: "Today", Icon: CalendarCheck, view: "today" },
  { id: "goals", label: "Goals", Icon: Target, view: "goals" },
  { id: "progress", label: "Progress", Icon: ChartLineUp, view: "progress" },
  { id: "focus", label: "Focus", Icon: Timer, view: "focus" },
  { id: "notes", label: "Notes", Icon: NotePencil, view: "notes" },
  { id: "outreach", label: "Outreach", Icon: PaperPlaneTilt, href: "/jobs" },
];

const BASE = 44; // resting item size (px)
const MAG = 26; // extra px at the cursor's focus
const SPREAD = 130; // px of cursor influence on either side

export function DockNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const mouseX = useMotionValue(Infinity);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const alwaysOn = coarse || !!reduce;

  useEffect(() => {
    if (alwaysOn) {
      setRevealed(true);
      return;
    }
    const onMove = (e: PointerEvent) => setRevealed(e.clientY > window.innerHeight - 132);
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [alwaysOn]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-3 sm:pb-4 pointer-events-none">
      <AnimatePresence initial={false}>
        {revealed ? (
          <motion.div
            key="dock"
            role="navigation"
            aria-label="Primary"
            initial={alwaysOn ? false : { y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.8 }}
            onMouseMove={(e) => !alwaysOn && mouseX.set(e.clientX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className="pointer-events-auto flex items-end gap-1.5 rounded-2xl border border-coffee/20 bg-cream-raised/80 px-2.5 py-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            {ENTRIES.map((e) => (
              <DockItem
                key={e.id}
                entry={e}
                mouseX={mouseX}
                magnify={!alwaysOn}
                active={!!e.view && e.view === view}
                onSelect={() => e.view && setView(e.view)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.button
            key="peek"
            type="button"
            aria-label="Show navigation"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            onMouseEnter={() => setRevealed(true)}
            onFocus={() => setRevealed(true)}
            className="pointer-events-auto group flex items-center justify-center py-1.5"
          >
            <span className="h-1.5 w-24 rounded-full bg-coffee/25 transition-colors group-hover:bg-coffee/50" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function DockItem({
  entry,
  mouseX,
  magnify,
  active,
  onSelect,
}: {
  entry: Entry;
  mouseX: MotionValue<number>;
  magnify: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (mx) => {
    const b = ref.current?.getBoundingClientRect();
    if (!b) return SPREAD * 2;
    return mx - (b.x + b.width / 2);
  });
  const sizeTarget = useTransform(
    distance,
    [-SPREAD, 0, SPREAD],
    magnify ? [BASE, BASE + MAG, BASE] : [BASE, BASE, BASE],
  );
  const size = useSpring(sizeTarget, { stiffness: 300, damping: 22, mass: 0.5 });

  const Icon = entry.Icon;
  const inner = (
    <motion.span
      style={{ width: size, height: size }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`relative flex items-center justify-center rounded-xl border transition-colors ${
        active
          ? "border-espresso/20 bg-espresso text-cream-raised"
          : "border-transparent bg-cream-base/50 text-coffee hover:bg-cream-base hover:text-espresso"
      }`}
    >
      <Icon size="50%" weight={active ? "fill" : "regular"} />
      {/* moving active indicator */}
      {active && (
        <motion.span
          layoutId="dock-active-dot"
          className="absolute -bottom-[7px] h-1 w-1 rounded-full bg-olive"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {/* hover label */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-espresso px-2 py-1 text-[10px] font-semibold tracking-wide text-cream-raised shadow-md"
          >
            {entry.label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.span>
  );

  const cls = "block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-olive/60";
  return entry.href ? (
    <Link
      ref={ref as React.Ref<HTMLAnchorElement>}
      href={entry.href}
      aria-label={entry.label}
      className={cls}
    >
      {inner}
    </Link>
  ) : (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      aria-label={entry.label}
      aria-current={active ? "page" : undefined}
      onClick={onSelect}
      className={cls}
    >
      {inner}
    </button>
  );
}

export default DockNav;
