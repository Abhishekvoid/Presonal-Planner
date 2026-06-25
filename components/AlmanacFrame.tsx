"use client";

import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Global geometric almanac frame. A fixed hairline rectangle inset from the
 * viewport with tick marks at each corner — the almanac-page motif, drawn once
 * over every route. Sits above page content and the sticky header (so its top
 * edge reads cleanly) but below modals, the preloader, the entry transition,
 * and the cursor. `pointer-events-none` so it never intercepts input.
 *
 * The hairline carries an embedded light: a slow (~8s) shared breath swells a
 * faint warm glow on the edge, with the corner embers peaking a touch brighter
 * as the anchors. Pure CSS (see `.frame-glow` / `.frame-ember` in globals.css)
 * — no JS loop, halts to a calm static glow under reduced motion.
 */
export function AlmanacFrame() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-3 z-40 border border-hair sm:inset-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.4 }}
    >
      {/* Breathing edge glow — the hairline's embedded light. */}
      <span className="frame-glow absolute inset-0" />

      {/* Corner embers (behind the ticks), riding the same breath. */}
      <span className="frame-ember absolute -left-2 -top-2 h-6 w-6 rounded-full" />
      <span className="frame-ember absolute -right-2 -top-2 h-6 w-6 rounded-full" />
      <span className="frame-ember absolute -bottom-2 -left-2 h-6 w-6 rounded-full" />
      <span className="frame-ember absolute -bottom-2 -right-2 h-6 w-6 rounded-full" />

      <span className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-espresso/60" />
      <span className="absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-espresso/60" />
      <span className="absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-espresso/60" />
      <span className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-espresso/60" />
    </motion.div>
  );
}

export default AlmanacFrame;
