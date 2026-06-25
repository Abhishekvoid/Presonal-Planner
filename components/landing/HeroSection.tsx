"use client";

import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * The hero. Colossal Archivo-Expanded headline whose variable width axis
 * animates from neutral to expanded on load (the type "breathes wider"). The
 * global PaperGrain shader sits behind. The CTA and the quieter skip link both
 * open the app — keyboard users and the impatient reach the planner directly.
 */
export function HeroSection({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="relative grid min-h-screen place-items-center px-5 sm:px-8">
      <button
        type="button"
        onClick={onOpen}
        className="label absolute right-5 top-5 z-10 text-coffee hover:text-espresso transition-colors sm:right-8 sm:top-6"
      >
        Skip to app →
      </button>

      <div className="flex flex-col items-center text-center">
        <motion.span
          className="label text-coffee"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.1 }}
        >
          The Almanac of Discipline
        </motion.span>

        <motion.h1
          className="font-display font-extrabold tracking-tightest text-espresso leading-[0.92] text-[clamp(3rem,15vw,11rem)]"
          initial={{ opacity: 0, fontVariationSettings: '"wdth" 100' }}
          animate={{ opacity: 1, fontVariationSettings: '"wdth" 125' }}
          transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.2 }}
        >
          DISCIPLINE,
          <br />
          MADE TACTILE
        </motion.h1>

        <motion.p
          className="mt-6 max-w-md text-coffee"
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
          className="mt-10 inline-flex items-center gap-2 rounded-md bg-espresso px-7 py-3 font-medium text-cream-raised hover:bg-olive-deep transition-colors"
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
        className="absolute bottom-7 left-1/2 -translate-x-1/2 text-coffee"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <motion.span
          className="block"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ↓
        </motion.span>
      </motion.div>
    </section>
  );
}
