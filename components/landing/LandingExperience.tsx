"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Preloader } from "./Preloader";
import { HeroSection } from "./HeroSection";
import { useEntryTransition } from "@/components/transitions/EntryTransition";
import { hasSeenIntro, markIntroSeen } from "@/lib/entry";

/**
 * Owns the first-visit choreography: Preloader (this session only) → Hero →
 * entry transition → app. `onEnter` flips the persisted entered flag in the
 * gate; we run it at the transition's midpoint so the app mounts behind the
 * ink overlay and is revealed in place.
 */
export function LandingExperience({ onEnter }: { onEnter: () => void }) {
  const [showPreloader, setShowPreloader] = useState(false);
  const [ready, setReady] = useState(false);
  const { overlay, play } = useEntryTransition();

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
      {ready && <HeroSection onOpen={handleOpen} />}
      {overlay}
    </>
  );
}
