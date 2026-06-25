"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Preloader } from "./Preloader";
import { HeroSection } from "./HeroSection";
import { useEntryTransition } from "@/components/transitions/EntryTransition";
import { hasSeenIntro, markIntroSeen } from "@/lib/entry";
import { useLenis } from "@/lib/useLenis";

/**
 * Owns the first-visit choreography: Preloader (this session only) → a
 * scroll-driven narrative (Hero → Manifesto → System → Enter) → entry
 * transition → app. `onEnter` flips the persisted entered flag in the gate; we
 * run it at the transition's midpoint so the app mounts behind the ink overlay
 * and is revealed in place. Lenis drives smooth scroll + GSAP ScrollTrigger.
 */
export function LandingExperience({ onEnter }: { onEnter: () => void }) {
  const [showPreloader, setShowPreloader] = useState(false);
  const [ready, setReady] = useState(false);
  const { overlay, play } = useEntryTransition();

  useLenis();

  // Decide once, after mount, whether the preloader plays this session.
  useEffect(() => {
    if (hasSeenIntro()) {
      setReady(true);
    } else {
      setShowPreloader(true);
    }
  }, []);

  const handlePreloaderDone = () => {
    markIntroSeen();
    setShowPreloader(false);
    setReady(true);
  };

  const handleOpen = () => play(onEnter);

  return (
    <>
      <AnimatePresence>
        {showPreloader && <Preloader key="pre" onDone={handlePreloaderDone} />}
      </AnimatePresence>

      {ready && (
        <main>
          <HeroSection onOpen={handleOpen} />

          {/* Placeholder sections — replaced by Manifesto / System / Enter in
              Tasks 2–4. They exist now so the page scrolls and Lenis/ScrollTrigger
              have real height to work with. */}
          <PlaceholderSection label="Manifesto" />
          <PlaceholderSection label="The System" />
          <PlaceholderSection label="Open the Almanac" />
        </main>
      )}

      {overlay}
    </>
  );
}

function PlaceholderSection({ label }: { label: string }) {
  return (
    <section className="grid h-screen place-items-center px-6">
      <span className="label text-coffee">{label}</span>
    </section>
  );
}
