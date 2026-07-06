"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccountability } from "@/lib/accountabilityStore";
import { formatClock } from "@/lib/focus";

// Circular progress ring to display partner's study target
function CircularProgress({
  value,
  max,
  size = 72,
  strokeWidth = 5,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedValue = Math.min(value, max);
  const percentage = max > 0 ? clampedValue / max : 0;
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-coffee/15 fill-none"
          strokeWidth={strokeWidth}
        />
        {/* Foreground circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-olive fill-none transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-mono font-bold text-espresso">
          {value}m
        </span>
        <span className="text-[7px] text-coffee/60 uppercase font-bold tracking-wider leading-none mt-0.5">
          / {max}m
        </span>
      </div>
    </div>
  );
}

const presetMessages = {
  nudge: [
    "Hey gorgeous, stop dreaming about me and focus! 😘",
    "I'm keeping my eyes on you... get back to work! 🧐💖",
    "Focus up! The faster we finish, the faster we can talk. 😉",
    "Sending a warm virtual hug to help you concentrate. 🤗✨",
    "A cute little reminder to crush your tasks today! 🥰",
  ],
  applaud: [
    "You're doing amazing, my love! ❤️",
    "Proud of you! Sending a virtual hug and a kiss. 😘",
    "You crush every task so beautifully. 😍",
    "My heart skips a beat seeing you work so hard! 💓",
    "Absolute superstar! You're inspiring me today. 🌟",
  ],
};

export function StudyLounge() {
  const isConnected = useAccountability((s) => s.isConnected);
  const roomCode = useAccountability((s) => s.roomCode);
  const yourName = useAccountability((s) => s.yourName);
  const partnerName = useAccountability((s) => s.partnerName);

  const customPusherAppId = useAccountability((s) => s.customPusherAppId);
  const customPusherKey = useAccountability((s) => s.customPusherKey);
  const customPusherSecret = useAccountability((s) => s.customPusherSecret);
  const customPusherCluster = useAccountability((s) => s.customPusherCluster);

  const partnerState = useAccountability((s) => s.partnerState);
  const alerts = useAccountability((s) => s.alerts);
  const dismissAlert = useAccountability((s) => s.dismissAlert);

  // Tick partner countdown clock locally
  const [partnerRemainingSec, setPartnerRemainingSec] = useState<number>(0);

  // Custom flirty / lovely active action panel state
  const [activeAction, setActiveAction] = useState<"nudge" | "applaud" | null>(null);
  const [customMsg, setCustomMsg] = useState("");
  const [partnerMoniker, setPartnerMoniker] = useState("My Favorite Distraction");

  useEffect(() => {
    if (!partnerName) return;
    const monikers = [
      "My Favorite Distraction",
      "My Sweetheart",
      "My Sunshine",
      "My Dearest",
      "Better Half",
      "My Bae",
      "My Love"
    ];
    // Dynamic selection on partner Name change or mount
    const randomIdx = Math.floor(Math.random() * monikers.length);
    setPartnerMoniker(monikers[randomIdx]);
  }, [partnerName]);

  useEffect(() => {
    if (
      !partnerState ||
      !partnerState.online ||
      !partnerState.isRunning ||
      !partnerState.timerEndsAt
    ) {
      setPartnerRemainingSec(
        partnerState ? Math.ceil(partnerState.timerRemainingMs / 1000) : 0
      );
      return;
    }

    const updateTime = () => {
      const msLeft = Math.max(0, partnerState.timerEndsAt! - Date.now());
      setPartnerRemainingSec(Math.ceil(msLeft / 1000));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [partnerState]);

  // Auto-dismiss alerts after 6 seconds
  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[alerts.length - 1];
      const timer = setTimeout(() => {
        dismissAlert(latest.id);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [alerts, dismissAlert]);

  const handleSendCustomAction = async () => {
    if (!activeAction || !roomCode) return;
    const payload = {
      roomCode,
      sender: yourName,
      event: activeAction,
      data: {
        message: customMsg.trim() || undefined,
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
      console.error(`Failed to send ${activeAction}:`, err);
    }
    setActiveAction(null);
    setCustomMsg("");
  };

  const isPartnerOnline = partnerState && partnerState.online;

  return (
    <div className="card bg-cream-raised border border-coffee/30 p-5 shadow-sm rounded-sm flex flex-col gap-4">
      {/* Alerts */}
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 border rounded-sm flex items-center justify-between text-xs font-mono font-bold ${
              alert.type === "nudge"
                ? "bg-clay/10 border-clay text-clay-deep"
                : "bg-olive/10 border-olive text-olive-deep"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{alert.type === "nudge" ? "⏰" : "🎉"}</span>
              <span>
                {alert.message || (alert.type === "nudge"
                  ? `${alert.sender} nudged you to focus!`
                  : `${alert.sender} applauded your progress!`)}
              </span>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-xs opacity-75 hover:opacity-100 font-bold ml-3"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Section */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-stretch">
        
        {/* Left column: Online status, Active task description, and Nudge/Applaud actions */}
        <div className="flex-grow flex-1 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-coffee-soft uppercase tracking-wider font-mono">
                {partnerMoniker}
              </span>
              <h3 className="text-lg font-bold text-espresso tracking-tight mt-0.5">
                {partnerName}
              </h3>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isPartnerOnline
                  ? "bg-olive/15 text-olive-deep border border-olive/20"
                  : "bg-coffee/10 text-coffee/60 border border-coffee/10"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isPartnerOnline ? "bg-olive animate-pulse" : "bg-coffee/30"
                }`}
              />
              <span>{isPartnerOnline ? "Online" : "Offline"}</span>
            </div>
          </div>

          {/* Activity State */}
          <div className="bg-cream-base/40 p-3.5 border border-coffee/10 rounded-sm">
            {isPartnerOnline ? (
              partnerState.isRunning ? (
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <span className="text-[9px] text-coffee-soft uppercase font-bold tracking-wider leading-none">
                      Focusing On
                    </span>
                    <p className="text-xs font-semibold text-espresso truncate mt-1">
                      {partnerState.activeTask || `Focus block (${partnerState.timerPhase})`}
                    </p>
                  </div>
                  <span className="font-mono text-xl font-bold text-olive-deep tabular-nums shrink-0 animate-pulse">
                    {formatClock(partnerRemainingSec)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-coffee leading-relaxed">
                  <span>Connected but not focusing.</span>
                  <span className="text-[10px] font-mono bg-coffee/10 px-2 py-0.5 border border-coffee/5 rounded-sm capitalize">
                    {partnerState.timerPhase === "short" || partnerState.timerPhase === "long"
                      ? "taking a break"
                      : "idle"}
                  </span>
                </div>
              )
            ) : (
              <div className="text-xs text-coffee-soft italic">
                Waiting for {partnerName} to study...
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isPartnerOnline && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveAction(activeAction === "nudge" ? null : "nudge");
                    setCustomMsg("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer border ${
                    activeAction === "nudge"
                      ? "bg-clay border-clay text-white shadow-sm font-bold"
                      : "bg-clay/10 hover:bg-clay/20 border-clay text-clay-deep"
                  }`}
                >
                  ⏰ Nudge
                </button>
                <button
                  onClick={() => {
                    setActiveAction(activeAction === "applaud" ? null : "applaud");
                    setCustomMsg("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer border ${
                    activeAction === "applaud"
                      ? "bg-olive border-olive text-white shadow-sm font-bold"
                      : "bg-olive/10 hover:bg-olive/20 border-olive text-olive-deep"
                  }`}
                >
                  👏 Applaud
                </button>
              </div>

              {/* Action Configuration Panel */}
              <AnimatePresence>
                {activeAction && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden bg-cream-base/60 border border-coffee/20 p-3 rounded-sm flex flex-col gap-3 shadow-inner"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-coffee-soft uppercase tracking-wider font-mono">
                        Send {activeAction === "nudge" ? "Nudge ⏰" : "Applaud 👏"}
                      </span>
                      <button
                        onClick={() => {
                          setActiveAction(null);
                          setCustomMsg("");
                        }}
                        className="text-[9px] text-coffee/60 hover:text-espresso font-bold cursor-pointer font-mono"
                      >
                        ✕ CLOSE
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-coffee/60 uppercase tracking-wider font-mono">
                        Sweet presets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {presetMessages[activeAction].map((presetText) => (
                          <button
                            key={presetText}
                            onClick={() => setCustomMsg(presetText)}
                            className={`text-[10px] px-2 py-1 rounded-sm border transition-all text-left font-mono cursor-pointer ${
                              customMsg === presetText
                                ? "border-espresso bg-coffee/15 text-espresso font-bold"
                                : "border-coffee/10 bg-cream-raised/50 hover:bg-cream-raised text-coffee hover:text-espresso"
                            }`}
                          >
                            {presetText}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Input */}
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[8px] font-bold text-coffee/60 uppercase tracking-wider font-mono">
                        Or write your own:
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customMsg}
                          onChange={(e) => setCustomMsg(e.target.value)}
                          placeholder={
                            activeAction === "nudge"
                              ? "Type a sweet reminder..."
                              : "Type a cute praise..."
                          }
                          className="flex-grow text-xs px-2.5 py-1.5 border border-coffee/30 bg-cream-raised focus:outline-none focus:border-espresso rounded-sm text-espresso font-mono placeholder:text-coffee/40"
                        />
                        <button
                          onClick={handleSendCustomAction}
                          disabled={!customMsg.trim()}
                          className={`px-3 py-1.5 text-xs font-bold rounded-sm border cursor-pointer transition-colors font-mono ${
                            activeAction === "nudge"
                              ? "bg-clay/10 hover:bg-clay/20 border-clay text-clay-deep disabled:opacity-50"
                              : "bg-olive/10 hover:bg-olive/20 border-olive text-olive-deep disabled:opacity-50"
                          }`}
                        >
                          SEND
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right column: Target Progress ring & completed task lists */}
        <div className="flex-1 border-t md:border-t-0 md:border-l border-coffee/15 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between gap-3">
          
          {/* Circular Target Progress */}
          <div className="flex items-center gap-4">
            <CircularProgress
              value={partnerState ? partnerState.focusMinutes : 0}
              max={partnerState ? partnerState.focusTarget : 240}
              size={64}
            />
            <div>
              <span className="text-[9px] font-bold text-coffee-soft uppercase tracking-wider block font-mono">
                Study Target
              </span>
              <p className="text-xs text-espresso font-semibold mt-0.5">
                {partnerState
                  ? `${partnerState.focusMinutes}m focused of ${partnerState.focusTarget}m target`
                  : `Daily focus metrics`}
              </p>
            </div>
          </div>

          {/* Checklist */}
          <div className="flex-grow flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-coffee-soft uppercase tracking-wider font-mono">
              Completed Tasks ({partnerState ? partnerState.completedTasks : 0}/
              {partnerState ? partnerState.totalTasks : 0})
            </span>
            {partnerState &&
            partnerState.completedTaskList &&
            partnerState.completedTaskList.length > 0 ? (
              <ul className="flex flex-col gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                {partnerState.completedTaskList.map((title, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-espresso/90">
                    <span className="h-4 w-4 shrink-0 rounded-full bg-olive/10 border border-olive/20 text-olive-deep flex items-center justify-center mt-0.5 font-bold text-[9px]">
                      ✓
                    </span>
                    <span className="truncate line-through text-coffee-soft">{title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-coffee-soft italic py-1">
                {isPartnerOnline ? "No tasks completed yet today." : "Offline"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default StudyLounge;
