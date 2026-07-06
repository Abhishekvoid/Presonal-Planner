"use client";

import { useEffect, useMemo, useRef } from "react";
import PusherClient from "pusher-js";
import { usePlanner } from "@/lib/store";
import { useAccountability } from "@/lib/accountabilityStore";
import { localDateKey, elapsedSec } from "@/lib/focus";

export function AccountabilitySync() {
  const isConnected = useAccountability((s) => s.isConnected);
  const roomCode = useAccountability((s) => s.roomCode);
  const yourName = useAccountability((s) => s.yourName);
  const partnerName = useAccountability((s) => s.partnerName);

  const customPusherAppId = useAccountability((s) => s.customPusherAppId);
  const customPusherKey = useAccountability((s) => s.customPusherKey);
  const customPusherSecret = useAccountability((s) => s.customPusherSecret);
  const customPusherCluster = useAccountability((s) => s.customPusherCluster);

  const activeTimer = usePlanner((s) => s.activeTimer);
  const tasks = usePlanner((s) => s.tasks);
  const sessions = usePlanner((s) => s.sessions);
  const days = usePlanner((s) => s.days);
  const focusSettings = usePlanner((s) => s.focusSettings);

  const statsRef = useRef({
    completedTasks: 0,
    totalTasks: 0,
    completedTaskList: [] as string[],
    focusMinutes: 0,
    focusTarget: 240,
  });

  // Calculate local stats reactively
  const localStats = useMemo(() => {
    const todayKey = localDateKey(new Date());
    const day = days.find((d) => d.date === todayKey);
    const dayTasks = day ? tasks.filter((t) => t.dayId === day.id) : [];
    const completedList = dayTasks.filter((t) => t.done).map((t) => t.text);
    const focusMin = sessions
      .filter((s) => s.date === todayKey)
      .reduce((acc, s) => acc + s.minutes, 0);
    const targetMin = 240; // Default target of 4 hours (240m)

    return {
      completedTasks: completedList.length,
      totalTasks: dayTasks.length,
      completedTaskList: completedList,
      focusMinutes: focusMin,
      focusTarget: targetMin,
    };
  }, [tasks, sessions, days, focusSettings]);

  // Keep ref up to date
  useEffect(() => {
    statsRef.current = localStats;
  }, [localStats]);

  // Broadcast state to partner
  const broadcastState = async () => {
    if (!isConnected || !roomCode || !yourName) return;

    const currentTimer = usePlanner.getState().activeTimer;
    const now = Date.now();
    let isRunning = false;
    let timerEndsAt: number | null = null;
    let timerRemainingMs = 0;
    let activeTaskText = "";

    if (currentTimer) {
      isRunning = !currentTimer.pausedAt;
      const elapsed = elapsedSec(currentTimer, now);
      const remainingSecs = Math.max(0, currentTimer.plannedSec - elapsed);
      timerRemainingMs = remainingSecs * 1000;
      timerEndsAt = isRunning ? now + timerRemainingMs : null;

      if (currentTimer.taskId) {
        const currentTasks = usePlanner.getState().tasks;
        const task = currentTasks.find((t) => t.id === currentTimer.taskId);
        activeTaskText = task ? task.text : "";
      }
    }

    const payload = {
      roomCode,
      sender: yourName,
      event: "partner-status",
      data: {
        online: true,
        activeTask: activeTaskText || (currentTimer ? `Focus Block (${currentTimer.mode})` : "Idle"),
        isRunning,
        timerEndsAt,
        timerRemainingMs,
        timerPhase: currentTimer ? currentTimer.mode : "work",
        completedTasks: statsRef.current.completedTasks,
        totalTasks: statsRef.current.totalTasks,
        completedTaskList: statsRef.current.completedTaskList,
        focusMinutes: statsRef.current.focusMinutes,
        focusTarget: statsRef.current.focusTarget,
      },
      customCredentials: customPusherAppId
        ? {
            appId: customPusherAppId,
            key: customPusherKey,
            secret: customPusherSecret,
            cluster: customPusherCluster,
          }
        : undefined,
    };

    try {
      await fetch("/api/accountability/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[AccountabilitySync] Broadcast failed:", err);
    }
  };

  // 1. Pusher subscription and connection
  useEffect(() => {
    if (!isConnected || !roomCode) return;

    // Use custom credentials or fallback to process.env config
    const key = customPusherKey || process.env.NEXT_PUBLIC_PUSHER_KEY || "";
    const cluster = customPusherCluster || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "";

    if (!key || !cluster) {
      console.warn("[AccountabilitySync] Pusher credentials missing.");
      return;
    }

    const client = new PusherClient(key, {
      cluster,
      forceTLS: true,
    });

    const channelName = `room-${roomCode}`;
    const channel = client.subscribe(channelName);

    console.log(`[AccountabilitySync] Listening on channel: ${channelName}`);

    // Listen for partner state changes
    channel.bind("partner-status", (payload: any) => {
      if (payload.sender !== yourName) {
        useAccountability.getState().updatePartnerState(payload.data);
      }
    });

    // Listen for nudges
    channel.bind("nudge", (payload: any) => {
      if (payload.sender !== yourName) {
        useAccountability.getState().addAlert("nudge", payload.sender);
      }
    });

    // Listen for applause
    channel.bind("applaud", (payload: any) => {
      if (payload.sender !== yourName) {
        useAccountability.getState().addAlert("applaud", payload.sender);
      }
    });

    // Initial broadcast on sync setup
    void broadcastState();

    return () => {
      channel.unbind_all();
      client.unsubscribe(channelName);
      client.disconnect();
      useAccountability.getState().clearPartnerState();
    };
  }, [isConnected, roomCode, yourName, customPusherKey, customPusherCluster]);

  // 2. Broadcast on local timer / checklist updates
  useEffect(() => {
    if (!isConnected || !roomCode) return;

    const timer = setTimeout(() => {
      void broadcastState();
    }, 1500); // Debounce updates

    return () => clearTimeout(timer);
  }, [activeTimer, localStats, isConnected, roomCode]);

  // 3. Heartbeat loop (every 10s)
  useEffect(() => {
    if (!isConnected || !roomCode) return;

    const interval = setInterval(() => {
      void broadcastState();
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected, roomCode, yourName]);

  // 4. Partner Offline watchdog (every 5s)
  useEffect(() => {
    if (!isConnected || !roomCode) return;

    const watchdog = setInterval(() => {
      const state = useAccountability.getState().partnerState;
      if (state && state.online) {
        const inactiveTime = Date.now() - state.lastActive;
        if (inactiveTime > 28000) {
          useAccountability.getState().updatePartnerState({ online: false });
        }
      }
    }, 5000);

    return () => clearInterval(watchdog);
  }, [isConnected, roomCode]);

  return null;
}
export default AccountabilitySync;
