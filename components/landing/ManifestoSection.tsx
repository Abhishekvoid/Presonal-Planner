"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/webgl";

const LINES = [
  "Discipline is not a feeling. It is a record.",
  "Each day, a page. Each task, a line of ink.",
  "Focus is the press that sets it for good.",
  "Close the day. Keep the streak unbroken.",
];

/**
 * Pinned scrollytelling. While the section is pinned, scroll progress scrubs
 * through the manifesto: each line letterpresses in as the previous presses
 * out. Reduced-motion / touch → no pin; the lines simply stack, hairline-ruled.
 */
export function ManifestoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion() || coarse) {
      setStacked(true);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const el = sectionRef.current;
    if (!el) return;

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      // ~0.8 screen of scroll per line — enough to read, not draggy
      end: `+=${LINES.length * 80}%`,
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const i = Math.min(LINES.length - 1, Math.floor(self.progress * LINES.length));
        setActive(i);
      },
    });
    return () => st.kill();
  }, []);

  if (stacked) {
    return (
      <section aria-label="Manifesto" className="px-6 py-24">
        <div className="mx-auto max-w-3xl divide-y divide-[color:var(--hair)]">
          {LINES.map((line) => (
            <p
              key={line}
              className="text-balance py-8 font-display text-2xl font-bold tracking-tightest text-espresso sm:text-4xl"
            >
              {line}
            </p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Manifesto"
      className="relative h-screen overflow-hidden"
    >
      <div className="relative grid h-full place-items-center px-6">
        <AnimatePresence>
          <motion.div
            key={active}
            className="absolute inset-0 grid place-items-center px-6"
            initial={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <p className="max-w-4xl text-balance text-center font-display text-[clamp(1.75rem,6vw,4.5rem)] font-extrabold leading-[1.02] tracking-tightest text-espresso">
              {LINES[active]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* progress diamonds — echo the section-divider mark */}
      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-2.5">
        {LINES.map((line, i) => (
          <span
            key={line}
            className={`h-1.5 w-1.5 rotate-45 transition-colors ${
              i === active ? "bg-olive" : "bg-[color:var(--hair)]"
            }`}
            aria-hidden
          />
        ))}
      </div>
    </section>
  );
}
