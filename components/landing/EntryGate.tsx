"use client";

import { useEntered } from "@/lib/entry";
import { Planner } from "@/components/Planner";
import { LandingExperience } from "./LandingExperience";

/**
 * The single decision point for `/`: returning visitors (entered flag set)
 * get the working app immediately; first-time visitors get the landing. No
 * routing — just a swap. Before mount we render the app shell so there is
 * never a flash of landing for a returning visitor (the app is the safe
 * default to show; the landing is additive).
 */
export default function EntryGate() {
  const { entered, mounted, enter, replay } = useEntered();

  if (!mounted) return <Planner replayIntro={replay} />;
  return entered ? (
    <Planner replayIntro={replay} />
  ) : (
    <LandingExperience onEnter={enter} />
  );
}
