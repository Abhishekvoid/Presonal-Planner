"use client";

import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * The hero. Colossal Archivo-Expanded headline whose variable width axis
 * animates from neutral to expanded on load (the type "breathes wider"). The
 * global PaperGrain shader sits behind and the global AlmanacFrame draws the
 * geometric border. Locked to the viewport — never scrolls. The CTA and the
 * quieter skip link both open the app, so keyboard users and the impatient
 * reach it directly.
 */
export function HeroSection({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="relative grid h-[100svh] place-items-center overflow-hidden px-5 sm:px-8">
      <button
        type="button"
        onClick={onOpen}
        className="label absolute right-6 top-6 z-10 text-coffee transition-colors hover:text-espresso sm:right-9 sm:top-9"
      >
        Skip to app →
      </button>

      <div className="relative flex flex-col items-center text-center">
        {/* Eyebrow flanked by clean rules */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.1 }}
        >
          <span className="h-px w-8 bg-[color:var(--hair)] sm:w-12" aria-hidden />
          <span className="label text-coffee">The Almanac of Discipline</span>
          <span className="h-px w-8 bg-[color:var(--hair)] sm:w-12" aria-hidden />
        </motion.div>

        <motion.h1
          className="mt-5 font-display text-[clamp(2.25rem,8.5vw,5.75rem)] font-extrabold leading-[0.95] tracking-tightest text-espresso"
          initial={{ opacity: 0, fontVariationSettings: '"wdth" 100' }}
          animate={{ opacity: 1, fontVariationSettings: '"wdth" 125' }}
          transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.2 }}
          data-trail-node
        >
          DISCIPLINE,
          <br />
          MADE TACTILE
        </motion.h1>

        <motion.p
          className="mt-5 max-w-sm text-sm leading-relaxed text-coffee sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.5 }}
        >
          A living paper field-journal for your goals, your days, and the streak
          you forge in focus.
        </motion.p>

        <motion.button
          type="button"
          onClick={onOpen}
          data-magnetic
          data-cursor-label="open"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-espresso px-7 py-3 text-sm font-medium text-cream-raised transition-colors hover:bg-olive-deep"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.65 }}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Open the Almanac
        </motion.button>
      </div>

      <motion.div
        aria-hidden
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-coffee"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <span className="label">Scroll</span>
        <motion.span
          className="block text-sm"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ↓
        </motion.span>
      </motion.div>
    </section>
  );
}
