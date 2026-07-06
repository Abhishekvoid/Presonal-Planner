"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PartnerState {
  online: boolean;
  lastActive: number;
  activeTask: string;
  isRunning: boolean;
  timerEndsAt: number | null;
  timerRemainingMs: number;
  timerPhase: string;
  completedTasks: number;
  totalTasks: number;
  completedTaskList: string[];
  focusMinutes: number;
  focusTarget: number;
}

export interface AccountabilityAlert {
  id: string;
  type: "nudge" | "applaud";
  sender: string;
  timestamp: number;
  message?: string;
}

interface AccountabilityState {
  // Connection Room
  yourName: string;
  partnerName: string;
  roomCode: string;
  isConnected: boolean;

  // Custom credentials (optional, falls back to env vars)
  customPusherKey: string;
  customPusherCluster: string;
  customPusherAppId: string;
  customPusherSecret: string;

  // Partner State
  partnerState: PartnerState | null;

  // Active transient notifications
  alerts: AccountabilityAlert[];

  // Actions
  setSettings: (settings: Partial<{
    yourName: string;
    partnerName: string;
    roomCode: string;
    customPusherKey: string;
    customPusherCluster: string;
    customPusherAppId: string;
    customPusherSecret: string;
  }>) => void;
  setConnected: (connected: boolean) => void;
  updatePartnerState: (partnerStatePatch: Partial<PartnerState>) => void;
  addAlert: (type: "nudge" | "applaud", sender: string, message?: string) => void;
  dismissAlert: (id: string) => void;
  clearPartnerState: () => void;
}

export const useAccountability = create<AccountabilityState>()(
  persist(
    (set) => ({
      yourName: "Abhishek",
      partnerName: "Ayushi",
      roomCode: "love-coding-2026",
      isConnected: true, // Connected by default

      customPusherKey: "",
      customPusherCluster: "",
      customPusherAppId: "",
      customPusherSecret: "",

      partnerState: null,
      alerts: [],

      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
      setConnected: (isConnected) => set({ isConnected }),
      updatePartnerState: (partnerStatePatch) =>
        set((state) => {
          const current = state.partnerState || {
            online: false,
            lastActive: 0,
            activeTask: "",
            isRunning: false,
            timerEndsAt: null,
            timerRemainingMs: 0,
            timerPhase: "work",
            completedTasks: 0,
            totalTasks: 0,
            completedTaskList: [],
            focusMinutes: 0,
            focusTarget: 240, // 4 hours target
          };
          const nextOnline = partnerStatePatch.online !== undefined ? partnerStatePatch.online : true;
          return {
            partnerState: {
              ...current,
              ...partnerStatePatch,
              lastActive: Date.now(),
              online: nextOnline,
            },
          };
        }),
      addAlert: (type, sender, message) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              id: `${type}-${Date.now()}-${Math.random()}`,
              type,
              sender,
              timestamp: Date.now(),
              message,
            },
          ],
        })),
      dismissAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),
      clearPartnerState: () => set({ partnerState: null }),
    }),
    {
      name: "goals-learning-accountability",
      partialize: (s) => ({
        yourName: s.yourName,
        partnerName: s.partnerName,
        roomCode: s.roomCode,
        customPusherKey: s.customPusherKey,
        customPusherCluster: s.customPusherCluster,
        customPusherAppId: s.customPusherAppId,
        customPusherSecret: s.customPusherSecret,
        isConnected: s.isConnected,
      }),
    }
  )
);
export default useAccountability;
