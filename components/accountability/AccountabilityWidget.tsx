"use client";

import { useEffect, useState } from "react";
import { useAccountability } from "@/lib/accountabilityStore";
import { formatClock } from "@/lib/focus";
import { Button, Field, inputClass, Modal } from "../primitives";

// Custom helper to calculate partner's ticking elapsed time locally
function getElapsedSec(partner: any, now: number): number {
  if (!partner || !partner.timerStartedAt) return 0;
  const startedMs = new Date(partner.timerStartedAt).getTime();
  const pausedMs =
    partner.timerPausedAccumMs +
    (partner.timerPausedAt ? now - new Date(partner.timerPausedAt).getTime() : 0);
  return Math.max(0, Math.floor((now - startedMs - pausedMs) / 1000));
}

export function AccountabilityWidget() {
  const roomCode = useAccountability((s) => s.roomCode);
  const userName = useAccountability((s) => s.userName);
  const partnerName = useAccountability((s) => s.partnerName);

  const pusherAppId = useAccountability((s) => s.pusherAppId);
  const pusherKey = useAccountability((s) => s.pusherKey);
  const pusherSecret = useAccountability((s) => s.pusherSecret);
  const pusherCluster = useAccountability((s) => s.pusherCluster);

  const partnerState = useAccountability((s) => s.partnerState);
  const notifications = useAccountability((s) => s.notifications);
  const removeNotification = useAccountability((s) => s.removeNotification);

  const setRoomCode = useAccountability((s) => s.setRoomCode);
  const setNames = useAccountability((s) => s.setNames);
  const setPusherCredentials = useAccountability((s) => s.setPusherCredentials);

  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings inputs
  const [inUser, setInUser] = useState(userName);
  const [inPartner, setInPartner] = useState(partnerName);
  const [inRoom, setInRoom] = useState(roomCode);
  const [inAppId, setInAppId] = useState(pusherAppId);
  const [inKey, setInKey] = useState(pusherKey);
  const [inSecret, setInSecret] = useState(pusherSecret);
  const [inCluster, setInCluster] = useState(pusherCluster);

  // Trigger local updates to keep the timer ticking smoothly
  const [timeTicker, setTimeTicker] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTimeTicker(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss notifications after 6 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      const timer = setTimeout(() => {
        removeNotification(latest.id);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notifications, removeNotification]);

  // Compute countdown timer state for partner
  const partnerTimerRemaining = partnerState?.timerStartedAt
    ? Math.max(0, partnerState.timerPlannedSec - getElapsedSec(partnerState, timeTicker))
    : 0;

  const partnerTimerActive =
    partnerState?.timerMode &&
    partnerState?.timerStartedAt &&
    !partnerState.timerPausedAt &&
    partnerTimerRemaining > 0;

  const triggerAction = async (type: "nudge" | "applaud") => {
    if (!roomCode) return;
    try {
      await fetch("/api/accountability/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          eventName: `${type}-trigger`,
          data: { sender: userName },
          pusherAppId: pusherAppId || undefined,
          pusherKey: pusherKey || undefined,
          pusherSecret: pusherSecret || undefined,
          pusherCluster: pusherCluster || undefined,
        }),
      });
    } catch (err) {
      console.error(`Failed to send ${type}:`, err);
    }
  };

  const handleSaveSettings = () => {
    setNames(inUser.trim() || "You", inPartner.trim() || "Partner");
    setRoomCode(inRoom.trim());
    setPusherCredentials(
      inAppId.trim(),
      inKey.trim(),
      inSecret.trim(),
      inCluster.trim() || "ap2"
    );
    setSettingsOpen(false);
  };

  const hasPusherCredentials =
    pusherKey || process.env.NEXT_PUBLIC_PUSHER_KEY;

  return (
    <>
      {/* ── Floating Dashboard Widget ───────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 select-none">
        
        {/* Alerts / Interaction Toasts */}
        <div className="flex flex-col gap-2 w-72 sm:w-80">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 border rounded-sm shadow-md animate-bounce flex items-center justify-between text-xs font-mono font-bold ${
                notif.type === "nudge"
                  ? "bg-clay/10 border-clay text-clay-deep"
                  : "bg-olive/10 border-olive text-olive-deep"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{notif.type === "nudge" ? "⏰" : "🎉"}</span>
                <span>
                  {notif.type === "nudge"
                    ? `${notif.sender} nudged you to focus!`
                    : `${notif.sender} applauded your progress!`}
                </span>
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="opacity-75 hover:opacity-100 transition-opacity ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Dashboard widget itself */}
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-espresso text-cream-base rounded-sm shadow-lg hover:bg-espresso/90 hover:-translate-y-[1px] active:translate-y-0 transition-all font-display text-xs font-bold uppercase tracking-wider border border-espresso/20"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  partnerState?.isOnline ? "bg-olive" : "bg-coffee/40"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  partnerState?.isOnline ? "bg-olive" : "bg-coffee/35"
                }`}
              />
            </span>
            👥 {partnerName}'s Dashboard
          </button>
        ) : (
          <div className="w-80 border border-coffee/30 bg-cream-raised p-4 shadow-xl rounded-sm flex flex-col gap-3.5 animate-fadeIn">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-coffee/15 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {partnerState?.isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-olive opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      partnerState?.isOnline ? "bg-olive" : "bg-coffee/35"
                    }`}
                  />
                </span>
                <span className="font-display text-xs font-extrabold tracking-tightest text-espresso uppercase">
                  {partnerName}
                </span>
                <span className="text-[9px] font-mono text-coffee-soft">
                  {partnerState?.isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="text-xs text-coffee hover:text-espresso"
                  title="Accountability Settings"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-xs text-coffee hover:text-espresso font-bold"
                  title="Minimize Widget"
                >
                  ▼
                </button>
              </div>
            </div>

            {/* Room linking status */}
            {!roomCode ? (
              <div className="py-4 text-center">
                <p className="text-xs text-coffee mb-2.5">
                  Not paired with an accountability partner yet.
                </p>
                <Button variant="solid" className="py-1 px-3 text-[11px]" onClick={() => setSettingsOpen(true)}>
                  Pair planners now
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5 flex-grow">
                {/* Active task details */}
                <div className="bg-cream-base/50 p-3 border border-coffee/10 rounded-sm flex flex-col gap-1.5 min-h-[72px]">
                  <span className="text-[9px] uppercase font-bold text-coffee-soft leading-none">
                    Current Focus Task
                  </span>
                  {partnerState?.activeTask ? (
                    <span className="text-xs font-semibold text-espresso leading-relaxed">
                      {partnerState.activeTask}
                    </span>
                  ) : (
                    <span className="text-xs italic text-coffee-soft">
                      {partnerState?.isOnline ? "Idle / Browsing" : "Not studying"}
                    </span>
                  )}
                </div>

                {/* Live ticking clock */}
                {partnerTimerActive && partnerState ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-olive/5 border border-olive/20 rounded-sm text-olive-deep animate-pulse">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-wider font-bold">
                        Focusing ({partnerState.timerMode})
                      </span>
                      <span className="font-mono text-xl font-bold leading-none mt-1">
                        {formatClock(partnerTimerRemaining)}
                      </span>
                    </div>
                    <span className="text-lg">⏳</span>
                  </div>
                ) : partnerState?.timerPausedAt && partnerTimerRemaining > 0 && partnerState ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-clay/5 border border-clay/20 rounded-sm text-clay-deep">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-wider font-bold">
                        Paused ({partnerState.timerMode})
                      </span>
                      <span className="font-mono text-xl font-bold leading-none mt-1">
                        {formatClock(partnerTimerRemaining)}
                      </span>
                    </div>
                    <span className="text-lg">⏸</span>
                  </div>
                ) : null}

                {/* Progress Indicators */}
                <div className="grid grid-cols-2 gap-2 border-t border-coffee/10 pt-3">
                  <div className="flex flex-col bg-coffee/[0.03] border border-coffee/5 p-2 rounded-sm text-center">
                    <span className="text-[8px] uppercase font-bold text-coffee-soft">Tasks Done</span>
                    <span className="font-display text-lg font-black text-espresso mt-0.5">
                      {partnerState?.completedTasks ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-col bg-coffee/[0.03] border border-coffee/5 p-2 rounded-sm text-center">
                    <span className="text-[8px] uppercase font-bold text-coffee-soft">Focus Time</span>
                    <span className="font-display text-lg font-black text-espresso mt-0.5">
                      {partnerState?.focusMinutes ?? 0}m
                    </span>
                  </div>
                </div>

                {/* Action controls (Applaud / Nudge) */}
                <div className="flex gap-2 border-t border-coffee/10 pt-3.5">
                  <button
                    onClick={() => triggerAction("nudge")}
                    disabled={!partnerState?.isOnline}
                    className="flex-1 py-2 bg-clay/10 border border-clay hover:bg-clay/20 disabled:opacity-40 text-clay-deep rounded-sm text-[11px] font-mono font-bold uppercase transition-all tracking-wider"
                  >
                    ⏰ Nudge
                  </button>
                  <button
                    onClick={() => triggerAction("applaud")}
                    disabled={!partnerState?.isOnline}
                    className="flex-1 py-2 bg-olive/10 border border-olive hover:bg-olive/20 disabled:opacity-40 text-olive-deep rounded-sm text-[11px] font-mono font-bold uppercase transition-all tracking-wider"
                  >
                    👏 Applaud
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Settings Modal ─────────────────────────────────────── */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Accountability settings">
        <div className="space-y-4 max-w-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your Name">
              <input
                className={inputClass}
                value={inUser}
                onChange={(e) => setInUser(e.target.value)}
                placeholder="Abhishek"
              />
            </Field>
            <Field label="Partner's Name">
              <input
                className={inputClass}
                value={inPartner}
                onChange={(e) => setInPartner(e.target.value)}
                placeholder="Partner"
              />
            </Field>
          </div>

          <Field label="Room Code (Shared pass key to connect)">
            <input
              className={inputClass}
              value={inRoom}
              onChange={(e) => setInRoom(e.target.value)}
              placeholder="e.g. love-coding-2026"
            />
          </Field>

          {/* Optional custom Pusher Credentials */}
          <details className="border border-coffee/15 rounded-sm overflow-hidden bg-cream-base/30">
            <summary className="cursor-pointer p-2.5 font-mono text-[10px] text-coffee hover:text-espresso">
              🛠 Custom Pusher credentials (optional)
            </summary>
            <div className="p-3 border-t border-coffee/10 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Pusher App Key">
                  <input
                    className={`${inputClass} font-mono text-[10px]`}
                    value={inKey}
                    onChange={(e) => setInKey(e.target.value)}
                    placeholder="App Key"
                  />
                </Field>
                <Field label="Pusher Cluster">
                  <input
                    className={`${inputClass} font-mono text-[10px]`}
                    value={inCluster}
                    onChange={(e) => setInCluster(e.target.value)}
                    placeholder="e.g. ap2"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Pusher App ID">
                  <input
                    className={`${inputClass} font-mono text-[10px]`}
                    value={inAppId}
                    onChange={(e) => setInAppId(e.target.value)}
                    placeholder="App ID"
                  />
                </Field>
                <Field label="Pusher Secret Key">
                  <input
                    type="password"
                    className={`${inputClass} font-mono text-[10px]`}
                    value={inSecret}
                    onChange={(e) => setInSecret(e.target.value)}
                    placeholder="Secret Key"
                  />
                </Field>
              </div>
              <p className="text-[9px] text-coffee-soft italic">
                Leave these blank to fall back on Netlify build environment variables.
              </p>
            </div>
          </details>

          {!hasPusherCredentials && (
            <div className="p-3 border border-clay/20 bg-clay/[0.03] text-clay-deep text-[10px] font-mono leading-relaxed rounded-sm">
              ⚠️ Warning: No Pusher Credentials detected! You must either define them via environment variables on Netlify or paste them in the custom credentials details box above.
            </div>
          )}

          <div className="flex justify-end gap-2 border-t hairline pt-3 mt-4">
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" onClick={handleSaveSettings}>
              Connect
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
export default AccountabilityWidget;
