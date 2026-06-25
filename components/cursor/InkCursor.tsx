"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/webgl";

/**
 * Custom "ink" cursor. A small dot that follows the pointer with easing, grows
 * and labels itself over targets that opt in via `data-cursor-label`, and is
 * magnetically pulled toward the centre of `data-magnetic` elements. Pointer-
 * fine only (no touch); under reduced motion it tracks 1:1 without smoothing.
 */
export function InkCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    setEnabled(fine.matches);
    const onChange = (e: MediaQueryListEvent) => setEnabled(e.matches);
    fine.addEventListener("change", onChange);
    return () => fine.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!dot) return;

    const reduced = prefersReducedMotion();
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = { ...pos };
    let scale = 1;
    let scaleTarget = 1;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const el = (e.target as HTMLElement)?.closest<HTMLElement>(
        "[data-cursor-label],[data-magnetic]",
      );
      // magnetic pull toward element centre
      const mag = el?.hasAttribute("data-magnetic") ? el : null;
      if (mag) {
        const r = mag.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        target.x += (cx - e.clientX) * 0.25;
        target.y += (cy - e.clientY) * 0.25;
      }
      const lbl = el?.getAttribute("data-cursor-label") ?? "";
      scaleTarget = el ? 2.4 : 1;
      if (label) {
        label.textContent = lbl;
        label.style.opacity = lbl ? "1" : "0";
      }
    };

    document.documentElement.style.cursor = "none";
    window.addEventListener("pointermove", onMove, { passive: true });

    const loop = () => {
      const k = reduced ? 1 : 0.2;
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      scale += (scaleTarget - scale) * (reduced ? 1 : 0.18);
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) scale(${scale})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.style.cursor = "";
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80]">
      <div
        ref={dotRef}
        className="absolute left-0 top-0 grid h-3 w-3 place-items-center rounded-full bg-espresso mix-blend-multiply dark:mix-blend-screen"
      >
        <span
          ref={labelRef}
          className="label whitespace-nowrap text-[7px] text-cream-raised opacity-0"
        />
      </div>
    </div>
  );
}
