"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { DemoTaskItem } from "./demo/DemoTaskItem";

/**
 * "The System" — three acts that double as the product demo. Each act reveals
 * on scroll and shows a real planner artifact (track chips, a live day card
 * whose tasks check off, a streak strip). Read-only: the day card uses
 * DemoTaskItem, which never touches the real store. Reduced motion → the
 * reveals resolve to their final state via the page-level MotionConfig.
 */
export function SystemSection() {
  return (
    <section aria-label="The System" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          <div className="label mb-2 text-coffee">How it works</div>
          <h2 className="font-display text-4xl font-extrabold tracking-tightest text-espresso sm:text-5xl">
            The System
          </h2>
        </motion.header>

        <div className="mt-16 space-y-24 sm:mt-20 sm:space-y-32">
          <Act n="01" title="Tracks feed Days" blurb="Group your work into tracks — each a thread of effort with its own colour and tag.">
            <div className="flex flex-wrap gap-2">
              {TRACKS.map((t) => (
                <span
                  key={t.tag}
                  className="inline-flex items-center gap-2 border border-hair bg-cream-raised px-3 py-2"
                >
                  <span className="h-2.5 w-2.5" style={{ backgroundColor: t.color }} aria-hidden />
                  <span className="label" style={{ color: t.color }}>
                    {t.tag}
                  </span>
                  <span className="text-sm text-espresso">{t.name}</span>
                </span>
              ))}
            </div>
          </Act>

          <Act
            n="02"
            title="Days hold Tasks"
            blurb="Every day is a page. Check tasks off and the ink sets — the day inches toward done."
            reverse
          >
            <div className="border hairline bg-cream-raised">
              <div className="flex items-center justify-between border-b hairline px-4 py-3">
                <span className="label text-coffee">Day 03 · Pointers &amp; memory</span>
                <span className="font-display text-xs font-bold text-coffee">2/3</span>
              </div>
              <div className="px-4">
                <DemoTaskItem text="Re-implement a vector: growth, move semantics" difficulty="hard" autoCheck delay={0.3} />
                <DemoTaskItem text="Draw the heap vs stack for one example" difficulty="med" autoCheck delay={0.9} />
                <DemoTaskItem text="Write three flashcards on ownership" difficulty="easy" />
              </div>
            </div>
          </Act>

          <Act
            n="03"
            title="Focus forges the streak"
            blurb="Run a focus block, close the day, keep the line unbroken. Consistency you can see."
          >
            <StreakStrip />
          </Act>
        </div>
      </div>
    </section>
  );
}

const TRACKS = [
  { tag: "FE", name: "Frontend", color: "var(--olive)" },
  { tag: "SYS", name: "Systems", color: "var(--clay)" },
  { tag: "DSA", name: "Algorithms", color: "var(--espresso)" },
  { tag: "ML", name: "Robotics / ML", color: "var(--olive-deep)" },
];

function Act({
  n,
  title,
  blurb,
  reverse = false,
  children,
}: {
  n: string;
  title: string;
  blurb: string;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="grid items-center gap-8 sm:grid-cols-2 sm:gap-12"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
    >
      <div className={reverse ? "sm:order-2" : ""}>
        <div className="label mb-3 text-olive-deep">Act {n}</div>
        <h3
          className="font-display text-2xl font-bold tracking-tightest text-espresso sm:text-3xl"
          data-trail-node
        >
          {title}
        </h3>
        <p className="mt-3 max-w-sm text-coffee">{blurb}</p>
      </div>
      <div className={reverse ? "sm:order-1" : ""}>{children}</div>
    </motion.div>
  );
}

/** A small consistency strip — three weeks of cells fill in on scroll, laid out
 *  as a tidy 7-column grid so it reads as a calendar, echoing the heatmap. */
function StreakStrip() {
  // 1 = kept, 0 = missed; deterministic so it reads as a real record
  const cells = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1];
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-5xl font-extrabold tracking-tightest tabular-nums text-espresso">
          14
        </span>
        <span className="label text-coffee">day streak</span>
      </div>
      <div className="mt-4 grid w-fit grid-cols-7 gap-1.5">
        {cells.map((c, i) => (
          <motion.span
            key={i}
            className={`h-4 w-4 ${c ? "bg-olive" : "border border-hair bg-cream-deep"}`}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO, delay: i * 0.025 }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
