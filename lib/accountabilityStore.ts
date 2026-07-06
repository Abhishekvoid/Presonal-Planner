"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PartnerState {
  name: string;
  activeTask: string | null;
  timerMode: "work" | "break" | "flow" | null;
  timerStartedAt: string | null;
  timerPlannedSec: number;
  timerPausedAccumMs: number;
  timerPausedAt: string | null;
  completedTasks: number;
  focusMinutes: number;
  lastActive: number;
  isOnline: boolean;
}

interface NotificationItem {
  id: string;
  type: "nudge" | "applaud";
  sender: string;
  timestamp: number;
}

interface AccountabilityStore {
  // Connection Room
  roomCode: string;
  userName: string;
  partnerName: string;

  // Custom credentials (optional, falls back to env vars)
  pusherAppId: string;
  pusherKey: string;
  pusherSecret: string;
  pusherCluster: string;

  // Partner State
  partnerState: PartnerState | null;

  // Active transient notifications
  notifications: NotificationItem[];

  // Actions
  setRoomCode: (code: string) => void;
  setNames: (user: string, partner: string) => void;
  setPusherCredentials: (appId: string, key: string, secret: string, cluster: string) => void;
  updatePartnerState: (state: Partial<PartnerState> | null) => void;
  addNotification: (type: "nudge" | "applaud", sender: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useAccountability = create<AccountabilityStore>()(
  persist(
    (set) => ({
      roomCode: "",
      userName: "Abhishek",
      partnerName: "Partner",

      pusherAppId: "",
      pusherKey: "",
      pusherSecret: "",
      pusherCluster: "ap2", // Default common cluster

      partnerState: null,
      notifications: [],

      setRoomCode: (roomCode) => set({ roomCode }),
      setNames: (userName, partnerName) => set({ userName, partnerName }),
      setPusherCredentials: (pusherAppId, pusherKey, pusherSecret, pusherCluster) =>
        set({ pusherAppId, pusherKey, pusherSecret, pusherCluster }),
      updatePartnerState: (state) =>
        set((s) => ({
          partnerState: state
            ? { ...(s.partnerState || {
                name: s.partnerName,
                activeTask: null,
                timerMode: null,
                timerStartedAt: null,
                timerPlannedSec: 0,
                timerPausedAccumMs: 0,
                timerPausedAt: null,
                completedTasks: 0,
                focusMinutes: 0,
                lastActive: Date.now(),
                isOnline: false,
              }), ...state }
            : null,
        })),
      addNotification: (type, sender) =>
        set((s) => ({
          notifications: [
            ...s.notifications,
            {
              id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type,
              sender,
              timestamp: Date.now(),
            },
          ],
        })),
      removeNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: "study-accountability-store",
    }
  )
);
