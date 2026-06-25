"use client";

import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Full-bleed geometric section divider. Breaks out of the content column to
 * span the whole viewport (the almanac frame crosses it, making clean +
 * junctions), with a hairline that draws outward from a small center diamond —
 * a satisfying bit of punctuation between sections. Decorative only.
 *
 * The reveal fires when the divider scrolls into view (once); under reduced
 * motion the page-level MotionConfig resolves it to the final state.
 */
export function SectionDivider({ className = "" }: { className?: string }) {
  const inView = {
    initial: { scaleX: 0 },
    whileInView: { scaleX: 1 },
    viewport: { once: true, margin: "-12% 0px" },
  } as const;

  return (
    <div aria-hidden className={`ml-[calc(50%-50vw)] w-screen ${className}`}>
      <div className="flex items-center">
        <motion.span
          className="h-px flex-1 origin-right bg-[color:var(--hair)]"
          {...inView}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        />
        <motion.span
          className="mx-3 h-1.5 w-1.5 rotate-45 bg-olive"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-12% 0px" }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.12 }}
        />
        <motion.span
          className="h-px flex-1 origin-left bg-[color:var(--hair)]"
          {...inView}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        />
      </div>
    </div>
  );
}

export default SectionDivider;
