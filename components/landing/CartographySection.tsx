"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useScrollScene } from "@/lib/useScrollScene";

const Cartography = dynamic(() => import("@/components/webgl/Cartography"), { ssr: false });

/**
 * The signature section. A tall scroll region with a sticky full-viewport
 * canvas; scroll progress scrubs the Cartography shader (terrain morph + halo
 * bloom). A caption sits on top. Reduced motion / touch → useScrollScene pins a
 * mid value and the shader renders a single frame; the tall scroll still reads
 * fine (it just isn't scrubbed).
 */
export function CartographySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useRef(0);
  useScrollScene(sectionRef, (p) => {
    progress.current = p;
  });

  return (
    <section ref={sectionRef} aria-label="Cartography of Effort" className="relative h-[300vh]">
      <div className="sticky top-0 grid h-screen place-items-center overflow-hidden">
        <Cartography progressRef={progress} className="absolute inset-0" />

        <motion.div
          className="relative max-w-2xl px-6 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <div className="label mb-3 text-coffee">Cartography of effort</div>
          <h2
            className="font-display text-[clamp(1.75rem,6vw,4rem)] font-extrabold leading-[1.0] tracking-tightest text-espresso"
            data-trail-node
          >
            Every day you keep
            <br />
            draws the map.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-coffee sm:text-base">
            Tracks become contours. Streaks become terrain. Scroll, and watch the
            record of your discipline rise into relief.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
