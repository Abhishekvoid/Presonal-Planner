"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ambient, SoundId } from "./ambient";

interface AmbientStore {
  sound: SoundId;
  volume: number; // 0..1
  playing: boolean;
  hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  toggle: () => void;
  selectSound: (id: SoundId) => void;
  setVolume: (v: number) => void;
}

export const useAmbient = create<AmbientStore>()(
  persist(
    (set, get) => ({
      sound: "brown",
      volume: 0.6,
      playing: false, // never persisted — browsers block autoplay on load
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      toggle: () => {
        const { playing, sound, volume } = get();
        if (playing) {
          ambient.stop();
          set({ playing: false });
        } else {
          ambient.setVolume(volume);
          ambient.play(sound);
          set({ playing: true });
        }
      },

      selectSound: (id) => {
        const { playing } = get();
        if (playing) ambient.setSound(id);
        set({ sound: id });
      },

      setVolume: (v) => {
        const vol = Math.max(0, Math.min(1, v));
        ambient.setVolume(vol);
        set({ volume: vol });
      },
    }),
    {
      name: "ambient-sound",
      partialize: (s) => ({ sound: s.sound, volume: s.volume }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
