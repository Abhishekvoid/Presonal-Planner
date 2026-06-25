"use client";

import { useEffect, useState } from "react";
import { useAmbient } from "@/lib/ambientStore";
import { SOUNDS } from "@/lib/ambient";
import { useSfx } from "@/lib/sound";

/** Two-reel cassette. Reels spin while playing (paused under reduced motion). */
function Cassette({
  playing,
  small = false,
  tone = "light",
}: {
  playing: boolean;
  small?: boolean;
  tone?: "light" | "dark";
}) {
  const reel = small ? "h-3 w-3" : "h-6 w-6";
  const spin = playing ? "animate-[spin_3s_linear_infinite]" : "";
  const ring = tone === "light" ? "border-cream-raised/80" : "border-coffee/70";
  const hub = tone === "light" ? "bg-cream-raised/80" : "bg-coffee/70";
  const slot = tone === "light" ? "border-cream-raised/40" : "border-coffee/40";
  return (
    <div
      className={`flex items-center justify-center gap-2 ${small ? "px-1" : "px-3 py-2"}`}
      aria-hidden
    >
      <span className={`relative ${reel} rounded-full border-2 ${ring} ${spin}`}>
        <span className={`absolute inset-[35%] rounded-full ${hub}`} />
      </span>
      {!small && <span className={`h-3 w-6 rounded-[2px] border ${slot}`} />}
      <span className={`relative ${reel} rounded-full border-2 ${ring} ${spin}`}>
        <span className={`absolute inset-[35%] rounded-full ${hub}`} />
      </span>
    </div>
  );
}

export function SoundDeck() {
  const hasHydrated = useAmbient((s) => s.hasHydrated);
  const sound = useAmbient((s) => s.sound);
  const volume = useAmbient((s) => s.volume);
  const playing = useAmbient((s) => s.playing);
  const toggle = useAmbient((s) => s.toggle);
  const selectSound = useAmbient((s) => s.selectSound);
  const setVolume = useAmbient((s) => s.setVolume);

  const { enabled: sfxOn, setEnabled: setSfxOn } = useSfx();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !hasHydrated) return null;

  const label = SOUNDS.find((s) => s.id === sound)?.label ?? "Brown";

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 print:hidden">
      {open && (
        <div className="w-64 border border-coffee/30 bg-cream-raised shadow-[0_24px_60px_-24px_rgba(42,33,27,0.55)]">
          {/* Deck window */}
          <div className="flex items-center justify-between gap-2 border-b hairline bg-espresso px-3 py-2.5">
            <Cassette playing={playing} tone="light" />
            <span className="label text-cream-raised/80">{playing ? "Playing" : "Paused"}</span>
          </div>

          <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <span className="label text-coffee">Ambient sound</span>
              <span className="font-display text-sm font-bold tracking-tightest text-espresso">
                {label}
              </span>
            </div>

            {/* Sound chips */}
            <div className="flex flex-wrap gap-1.5">
              {SOUNDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSound(s.id)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    sound === s.id
                      ? "bg-espresso text-cream-raised"
                      : "border border-coffee/30 text-coffee hover:border-coffee/60 hover:text-espresso"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Transport */}
            <button
              onClick={toggle}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-espresso px-4 py-2 text-sm font-medium text-cream-raised transition-colors hover:bg-olive-deep"
            >
              {playing ? "■ Stop" : "▶ Play"}
            </button>

            {/* Volume */}
            <label className="flex items-center gap-2">
              <span className="label text-coffee shrink-0">Vol</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                aria-label="Ambient volume"
                className="w-full accent-olive"
              />
            </label>

            {/* Interface cues — synth UI sounds, off by default */}
            <div className="flex items-center justify-between border-t hairline pt-3">
              <span className="label text-coffee">Interface cues</span>
              <button
                onClick={() => setSfxOn(!sfxOn)}
                role="switch"
                aria-checked={sfxOn}
                aria-label="Toggle interface sound cues"
                className={`relative h-5 w-9 rounded-full border transition-colors ${
                  sfxOn ? "border-olive bg-olive" : "border-coffee/40 bg-cream-deep"
                }`}
              >
                <span
                  className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-cream-raised transition-all ${
                    sfxOn ? "left-[18px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed cassette button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close ambient sound" : "Open ambient sound"}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-md border border-coffee/40 px-2 py-1.5 shadow-[0_8px_24px_-12px_rgba(42,33,27,0.5)] transition-colors ${
          playing ? "bg-espresso" : "bg-cream-raised hover:bg-cream-deep"
        }`}
      >
        <Cassette playing={playing} small tone={playing ? "light" : "dark"} />
        {playing && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-olive-soft" aria-hidden />}
      </button>
    </div>
  );
}
