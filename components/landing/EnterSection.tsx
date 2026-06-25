"use client";

import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * The closing section. After the narrative, a final pitch and the primary CTA
 * that runs the Phase-1 ink-wipe entry transition (via `onOpen`) into the live
 * app. The Hero's CTA remains the impatient/skip path; this is the considered
 * one at the end of the journey.
 */
export function EnterSection({ onOpen }: { onOpen: () => void }) {
  return (
    <section
      aria-label="Open the Almanac"
      className="relative grid min-h-screen place-items-center px-6 text-center"
    >
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
      >
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-[color:var(--hair)] sm:w-12" aria-hidden />
          <span className="label text-coffee">Begin</span>
          <span className="h-px w-8 bg-[color:var(--hair)] sm:w-12" aria-hidden />
        </div>

        <h2 className="mt-5 font-display text-[clamp(2rem,7vw,4.75rem)] font-extrabold leading-[0.95] tracking-tightest text-espresso">
          Open the Almanac
        </h2>

        <p className="mt-5 max-w-md text-sm leading-relaxed text-coffee sm:text-base">
          Your pages are waiting. Today is page one — and the only one you have
          to write right now.
        </p>

        <motion.button
          type="button"
          onClick={onOpen}
          data-magnetic
          data-cursor-label="open"
          className="mt-9 inline-flex items-center gap-2 rounded-md bg-espresso px-8 py-3.5 text-sm font-medium text-cream-raised transition-colors hover:bg-olive-deep"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Open the Almanac →
        </motion.button>
      </motion.div>
    </section>
  );
}
