"use client";

import { useEffect, useMemo } from "react";
import PusherClient from "pusher-js";
import { usePlanner } from "@/lib/store";
import { useAccountability } from "@/lib/accountabilityStore";
import { localDateKey } from "@/lib/focus";

export function AccountabilitySync() {
  const roomCode = useAccountability((s) => s.roomCode);
  const userName = useAccountability((s) => s.userName);
  const partnerName = useAccountability((s) => s.partnerName);

  const pusherAppId = useAccountability((s) => s.pusherAppId);
  const pusherKey = useAccountability((s) => s.pusherKey);
  const pusherSecret = useAccountability((s) => s.pusherSecret);
  const pusherCluster = useAccountability((s) => s.pusherCluster);

  const activeTimer = usePlanner((s) => s.activeTimer);
  const tasks = usePlanner((s) => s.tasks);
  const sessions = usePlanner((s) => s.sessions);

  // Compute stats to trigger updates
  const completedTasksToday = useMemo(() => {
    const todayKey = localDateKey(new Date());
    return tasks.filter((t) => t.done && t.doneAt && t.doneAt.startsWith(todayKey)).length;
  }, [tasks]);

  const focusMinutesToday = useMemo(() => {
    const todayKey = localDateKey(new Date());
    return sessions
      .filter((s) => s.date === todayKey)
      .reduce((acc, s) => acc + s.minutes, 0);
  }, [sessions]);

  // Securely broadcast status via server endpoint
  const broadcastStatus = async () => {
    if (!roomCode) return;

    let activeTaskText: string | null = null;
    const currentTimer = usePlanner.getState().activeTimer;
    if (currentTimer && currentTimer.taskId) {
      const currentTasks = usePlanner.getState().tasks;
      const task = currentTasks.find((t) => t.id === currentTimer.taskId);
      activeTaskText = task ? task.text : null;
    }

    const payload = {
      roomCode,
      eventName: "status-update",
      data: {
        sender: userName,
        activeTask: activeTaskText,
        timerMode: currentTimer ? currentTimer.mode : null,
        timerStartedAt: currentTimer ? currentTimer.startedAt : null,
        timerPlannedSec: currentTimer ? currentTimer.plannedSec : 0,
        timerPausedAccumMs: currentTimer ? currentTimer.pausedAccumMs : 0,
        timerPausedAt: currentTimer ? currentTimer.pausedAt : null,
        completedTasks: completedTasksToday,
        focusMinutes: focusMinutesToday,
      },
      pusherAppId: pusherAppId || undefined,
      pusherKey: pusherKey || undefined,
      pusherSecret: pusherSecret || undefined,
      pusherCluster: pusherCluster || undefined,
    };

    try {
      await fetch("/api/accountability/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[AccountabilitySync] Failed to publish status:", err);
    }
  };

  // 1. Pusher subscription management
  useEffect(() => {
    if (!roomCode) return;

    // Use user-configured key OR Netlify build key
    const key = pusherKey || process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = pusherCluster || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";

    if (!key) {
      console.warn("[AccountabilitySync] No Pusher Key configured.");
      return;
    }

    const client = new PusherClient(key, {
      cluster,
      forceTLS: true,
    });

    const channelName = `accountability-${roomCode}`;
    const channel = client.subscribe(channelName);

    console.log(`[AccountabilitySync] Connecting to room: ${channelName}`);

    // Update partner status on event
    channel.bind("status-update", (data: any) => {
      if (data.sender !== userName) {
        useAccountability.getState().updatePartnerState({
          name: data.sender,
          activeTask: data.activeTask,
          timerMode: data.timerMode,
          timerStartedAt: data.timerStartedAt,
          timerPlannedSec: data.timerPlannedSec,
          timerPausedAccumMs: data.timerPausedAccumMs,
          timerPausedAt: data.timerPausedAt,
          completedTasks: data.completedTasks,
          focusMinutes: data.focusMinutes,
          isOnline: true,
          lastActive: Date.now(),
        });
      }
    });

    // Alert toast on nudge
    channel.bind("nudge-trigger", (data: any) => {
      if (data.sender !== userName) {
        useAccountability.getState().addNotification("nudge", data.sender);
      }
    });

    // Alert toast on applause
    channel.bind("applaud-trigger", (data: any) => {
      if (data.sender !== userName) {
        useAccountability.getState().addNotification("applaud", data.sender);
      }
    });

    // Send initial status immediately on link
    broadcastStatus();

    return () => {
      channel.unbind_all();
      client.unsubscribe(channelName);
      client.disconnect();
    };
  }, [roomCode, pusherKey, pusherCluster, userName]);

  // 2. React to changes and broadcast
  useEffect(() => {
    if (!roomCode) return;

    const timeoutId = setTimeout(() => {
      broadcastStatus();
    }, 1500); // 1.5s debounce to bundle quick actions

    return () => clearTimeout(timeoutId);
  }, [activeTimer, completedTasksToday, focusMinutesToday, roomCode]);

  // 3. Heartbeat (every 12 seconds)
  useEffect(() => {
    if (!roomCode) return;

    const intervalId = setInterval(() => {
      broadcastStatus();
    }, 12000);

    return () => clearInterval(intervalId);
  }, [roomCode, userName]);

  // 4. Partner Offline Detection (every 5 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const state = useAccountability.getState();
      const partner = state.partnerState;
      if (partner && partner.isOnline) {
        const inactiveMs = Date.now() - partner.lastActive;
        if (inactiveMs > 28000) {
          // If no message for 28s, mark offline
          state.updatePartnerState({ isOnline: false });
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return null; // Headless synchronization coordinator
}
export default AccountabilitySync;
