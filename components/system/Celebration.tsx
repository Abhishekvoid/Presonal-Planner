"use client";

/**
 * Milestone celebration — a tasteful spark burst for the big wins (finishing a
 * whole day's tasks), distinct from TaskItem's per-checkbox ring. `useCelebrate()`
 * returns a function you call with an optional screen origin. Premium-subtle:
 * a quick radial ring + a handful of brand-coloured sparks. Reduced-motion gets
 * just the ring.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

interface Origin { x: number; y: number }
interface Burst { id: number; x: number; y: number }

const CelebrateCtx = createContext<(o?: Origin) => void>(() => {});
export const useCelebrate = () => useContext(CelebrateCtx);

const COLORS = ["var(--olive)", "var(--clay)", "var(--espresso)", "var(--olive-deep)"];
let cid = 0;

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);

  const celebrate = useCallback((o?: Origin) => {
    const x = o?.x ?? window.innerWidth / 2;
    const y = o?.y ?? window.innerHeight / 2.4;
    const id = ++cid;
    setBursts((b) => [...b, { id, x, y }]);
    window.setTimeout(() => setBursts((b) => b.filter((z) => z.id !== id)), 1200);
  }, []);

  return (
    <CelebrateCtx.Provider value={celebrate}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[70]">
        <AnimatePresence>
          {bursts.map((b) => (
            <Spark key={b.id} x={b.x} y={b.y} />
          ))}
        </AnimatePresence>
      </div>
    </CelebrateCtx.Provider>
  );
}

function Spark({ x, y }: { x: number; y: number }) {
  const reduce = useReducedMotion();
  const n = reduce ? 0 : 16;
  const parts = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 46 + Math.random() * 54;
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          color: COLORS[i % COLORS.length],
          size: 3 + Math.random() * 3,
          dur: 0.7 + Math.random() * 0.25,
        };
      }),
    [n],
  );

  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <motion.span
        aria-hidden
        className="absolute block rounded-full border-2 border-olive"
        style={{ translateX: "-50%", translateY: "-50%" }}
        initial={{ width: 10, height: 10, opacity: 0.7 }}
        animate={{ width: reduce ? 44 : 108, height: reduce ? 44 : 108, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {parts.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute block rounded-full"
          style={{ background: p.color, width: p.size, height: p.size, translateX: "-50%", translateY: "-50%" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.35 }}
          transition={{ duration: p.dur, ease: EASE_OUT_EXPO }}
        />
      ))}
    </div>
  );
}
