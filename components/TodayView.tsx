"use client";

import { motion } from "framer-motion";
import { useMemo, useState, useEffect, useRef } from "react";
import { usePlanner } from "@/lib/store";
import { ReflectionCard } from "./focus/ReflectionCard";
import { EASE_OUT_EXPO, springSoft } from "@/lib/motion";
import {
  dayProgress,
  orderedDays,
  orderedTracks,
  tasksForDayAndTrack,
} from "@/lib/selectors";
import { Day, Task, Track } from "@/lib/types";
import { yesterdayKey } from "@/lib/focus";
import { TaskItem } from "./TaskItem";
import { Button, Modal, ProgressBar } from "./primitives";
import { DayForm, TaskForm } from "./forms";
import { PressIn } from "@/lib/kineticType";
import { SectionDivider } from "./SectionDivider";

const delay = (i: number) => ({ animationDelay: `${i * 0.06}s` });

export function TodayView() {
  const state = usePlanner();
  const days = useMemo(() => orderedDays(state), [state]);
  const tracks = useMemo(() => orderedTracks(state), [state]);

  const [activeId, setActiveId] = useState<string | null>(days[0]?.id ?? null);
  const day = days.find((d) => d.id === activeId) ?? days[0] ?? null;

  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false });
  const [dayModal, setDayModal] = useState(false);
  const [queryModal, setQueryModal] = useState(false);
  const [simQuery, setSimQuery] = useState("n1");

  if (!day) {
    return (
      <div className="py-24 text-center">
        <p className="text-coffee mb-4">No days yet.</p>
        <Button variant="solid" onClick={() => setDayModal(true)}>
          + Add your first day
        </Button>
        <Modal open={dayModal} onClose={() => setDayModal(false)} title="New day">
          <DayForm onDone={() => setDayModal(false)} />
        </Modal>
      </div>
    );
  }

  const prog = dayProgress(state, day.id);

  // Compute focus stats for tasks assigned to the active day
  const dayTasks = useMemo(() => {
    return state.tasks.filter((t) => t.dayId === day.id);
  }, [state.tasks, day.id]);

  const daySessions = useMemo(() => {
    const tIds = new Set(dayTasks.map((t) => t.id));
    return state.sessions.filter((s) => s.taskId && tIds.has(s.taskId));
  }, [state.sessions, dayTasks]);

  const totalFocusMinutes = useMemo(() => {
    return daySessions.reduce((sum, s) => sum + s.minutes, 0);
  }, [daySessions]);

  const mustItems = useMemo(() => {
    if (!day.must) return [];
    const lines = day.must.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 1) {
      return day.must
        .split(/\.\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.endsWith(".") ? s.slice(0, -1) : s));
    }
    return lines;
  }, [day.must]);

  const [checkedMusts, setCheckedMusts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem(`must-checked-${day.id}`);
    if (saved) {
      try {
        setCheckedMusts(JSON.parse(saved));
      } catch {
        setCheckedMusts({});
      }
    } else {
      setCheckedMusts({});
    }
  }, [day.id]);

  const toggleMust = (idx: number) => {
    const next = { ...checkedMusts, [idx]: !checkedMusts[idx] };
    setCheckedMusts(next);
    localStorage.setItem(`must-checked-${day.id}`, JSON.stringify(next));
  };

  const [pitchChecked, setPitchChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem(`pitch-checked-${day.id}`);
    if (saved) {
      try {
        setPitchChecked(JSON.parse(saved));
      } catch {
        setPitchChecked({});
      }
    } else {
      setPitchChecked({});
    }
  }, [day.id]);

  const togglePitch = (key: string) => {
    const next = { ...pitchChecked, [key]: !pitchChecked[key] };
    setPitchChecked(next);
    localStorage.setItem(`pitch-checked-${day.id}`, JSON.stringify(next));
  };

  const isTimerRunning = useMemo(() => {
    return state.activeTimer !== null && state.activeTimer.pausedAt === null && state.activeTimer.mode === "work";
  }, [state.activeTimer]);

  const [activeSpace, setActiveSpace] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("study-active-space") ?? "library";
    }
    return "library";
  });

  const SPACES = useMemo(() => [
    { id: "library", name: "📜 Library", synth: "binaural" },
    { id: "cyberpunk", name: "⚡ Terminal", synth: "brown" },
    { id: "nasa", name: "🚀 NASA Control", synth: "rain" },
  ], []);

  const handleSpaceChange = (spaceId: string) => {
    setActiveSpace(spaceId);
    localStorage.setItem("study-active-space", spaceId);
    if (isAudioPlaying) {
      if (spaceId === "library") {
        updateVolume("master", 50);
        updateVolume("binaural", 50);
        updateVolume("brown", 0);
        updateVolume("rain", 0);
      } else if (spaceId === "cyberpunk") {
        updateVolume("master", 50);
        updateVolume("binaural", 0);
        updateVolume("brown", 60);
        updateVolume("rain", 0);
      } else if (spaceId === "nasa") {
        updateVolume("master", 50);
        updateVolume("binaural", 0);
        updateVolume("brown", 0);
        updateVolume("rain", 60);
      }
    } else {
      if (spaceId === "library") {
        setMasterVol(50);
        setBinauralVol(50);
        setBrownVol(0);
        setRainVol(0);
      } else if (spaceId === "cyberpunk") {
        setMasterVol(50);
        setBinauralVol(0);
        setBrownVol(60);
        setRainVol(0);
      } else if (spaceId === "nasa") {
        setMasterVol(50);
        setBinauralVol(0);
        setBrownVol(0);
        setRainVol(60);
      }
    }
  };

  const [showGlitch, setShowGlitch] = useState(false);
  const [pausesCount, setPausesCount] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [rivalBonus, setRivalBonus] = useState(0);

  useEffect(() => {
    const pCount = Number(localStorage.getItem(`focus-pauses-${day.id}`) ?? 0);
    setPausesCount(pCount);
    const pAmt = Number(localStorage.getItem(`focus-distraction-penalty-${day.id}`) ?? 0);
    setPenalty(pAmt);
    const rBonus = Number(localStorage.getItem(`rival-bonus-${day.id}`) ?? 0);
    setRivalBonus(rBonus);
  }, [day.id]);

  const [mockCapital, setMockCapital] = useState(0);

  useEffect(() => {
    const completedSessionsCount = daySessions.length;
    setMockCapital(Math.max(0, completedSessionsCount * 1500 - penalty));
  }, [daySessions, penalty]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setMockCapital((prev) => Math.max(0, prev + 25));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const triggerDistractionPenalty = () => {
    setShowGlitch(true);
    setTimeout(() => setShowGlitch(false), 1200);

    const nextPauses = Number(localStorage.getItem(`focus-pauses-${day.id}`) ?? 0) + 1;
    setPausesCount(nextPauses);
    localStorage.setItem(`focus-pauses-${day.id}`, String(nextPauses));

    const nextPenalty = Number(localStorage.getItem(`focus-distraction-penalty-${day.id}`) ?? 0) + 100;
    setPenalty(nextPenalty);
    localStorage.setItem(`focus-distraction-penalty-${day.id}`, String(nextPenalty));

    const nextRivalBonus = Number(localStorage.getItem(`rival-bonus-${day.id}`) ?? 0) + 3;
    setRivalBonus(nextRivalBonus);
    localStorage.setItem(`rival-bonus-${day.id}`, String(nextRivalBonus));

    // Web Audio Low Buzz
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.value = 110;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  const [lastPausedAt, setLastPausedAt] = useState<number | null>(null);

  useEffect(() => {
    const pausedAt = state.activeTimer?.pausedAt;
    if (pausedAt) {
      const parsedTime = typeof pausedAt === "string" ? new Date(pausedAt).getTime() : pausedAt;
      if (parsedTime !== lastPausedAt) {
        setLastPausedAt(parsedTime);
        triggerDistractionPenalty();
      }
    } else {
      setLastPausedAt(null);
    }
  }, [state.activeTimer?.pausedAt]);

  const [cohort, setCohort] = useState([
    { name: "Vikram S. (IIT-B)", action: "Coding DSA", minutes: 395, status: "active", isYou: false },
    { name: "Rohan K. (IIT-D)", action: "System Design", minutes: 312, status: "active", isYou: false },
    { name: "Pooja M. (BITS-P)", action: "On Break", minutes: 185, status: "break", isYou: false },
    { name: "Nikhil S. (IIIT-H)", action: "Query Profiling", minutes: 274, status: "active", isYou: false },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCohort((prev) =>
        prev.map((c) => {
          if (c.status === "active") {
            return { ...c, minutes: c.minutes + (Math.random() > 0.75 ? 1 : 0) };
          }
          return c;
        })
      );
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const sortedCohort = useMemo(() => {
    const youItem = {
      name: "You (Nexus Automech)",
      action: isTimerRunning ? "Coding Django" : "Idle",
      minutes: totalFocusMinutes,
      status: isTimerRunning ? "active" : "idle",
      isYou: true,
    };
    const items = [...cohort, youItem];
    items.sort((a, b) => b.minutes - a.minutes);
    return items;
  }, [cohort, totalFocusMinutes, isTimerRunning]);

  const rivalLogs = useMemo(() => {
    const index = day.index;
    const items = [
      { time: "9:15 AM", text: `Vikram S. completed a 25m DSA focus block on pattern: Two Pointer.` },
      { time: "11:45 AM", text: `Vikram S. studied 'PostgreSQL transaction isolation levels' (40m).` },
      { time: "2:30 PM", text: `Vikram S. solved Medium problem '3Sum' in 8 minutes.` },
      { time: "6:10 PM", text: `Vikram S. logged focus block: 'Advanced System Design: Rate Limiter.'` }
    ];
    if (index % 2 === 0) {
      return [
        { time: "8:30 AM", text: `Vikram S. completed a 25m System Design block: API Rate Limiter.` },
        { time: "10:15 AM", text: `Vikram S. solved 'Move Zeroes (LC #283)' in 3 minutes.` },
        { time: "1:45 PM", text: `Vikram S. studied 'Django transactions & auto-commit' (35m).` },
        { time: "5:00 PM", text: `Vikram S. logged focus block: 'Mock Interview Prep: Behavioral STAR.'` }
      ];
    }
    return items;
  }, [day.index]);

  const winProbability = useMemo(() => {
    const p = prog.pct;
    const baseVal = 45 + Math.round(p * 0.4);
    const val = Math.min(95, Math.max(15, baseVal - rivalBonus));
    return { you: val, rival: 100 - val };
  }, [prog.pct, rivalBonus]);

  const balancedCols = useMemo(() => {
    const activeTracks = tracks
      .map((t) => {
        const tasks = tasksForDayAndTrack(state, day.id, t.id);
        const weight = tasks.length + (t.id === "track-interview" ? 3 : 0);
        return { track: t, tasks, weight };
      })
      .filter((item) => item.tasks.length > 0);

    activeTracks.sort((a, b) => b.weight - a.weight);

    const col1: typeof activeTracks = [];
    const col2: typeof activeTracks = [];
    let w1 = 0;
    let w2 = 0;

    activeTracks.forEach((item) => {
      if (w1 <= w2) {
        col1.push(item);
        w1 += item.weight;
      } else {
        col2.push(item);
        w2 += item.weight;
      }
    });

    return { col1, col2 };
  }, [tracks, state, day.id]);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [masterVol, setMasterVol] = useState(50);
  const [brownVol, setBrownVol] = useState(50);
  const [rainVol, setRainVol] = useState(30);
  const [binauralVol, setBinauralVol] = useState(20);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const brownSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rainSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const oscLRef = useRef<OscillatorNode | null>(null);
  const oscRRef = useRef<OscillatorNode | null>(null);

  const masterGainRef = useRef<GainNode | null>(null);
  const brownGainRef = useRef<GainNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const binauralGainRef = useRef<GainNode | null>(null);

  const startAudio = () => {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVol / 100, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    const brownGain = ctx.createGain();
    brownGain.gain.setValueAtTime(brownVol / 100, ctx.currentTime);
    brownGain.connect(masterGain);
    brownGainRef.current = brownGain;

    const bufferSize = 10 * ctx.sampleRate;
    const brownBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const brownData = brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      brownData[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = brownData[i];
      brownData[i] *= 3.5;
    }

    const brownSource = ctx.createBufferSource();
    brownSource.buffer = brownBuffer;
    brownSource.loop = true;
    brownSource.connect(brownGain);
    brownSource.start(0);
    brownSourceRef.current = brownSource;

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(rainVol / 100, ctx.currentTime);
    rainGain.connect(masterGain);
    rainGainRef.current = rainGain;

    const rainBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const rainData = rainBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      rainData[i] = Math.random() * 2 - 1;
    }

    const rainSource = ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.65;

    rainSource.connect(filter);
    filter.connect(rainGain);
    rainSource.start(0);
    rainSourceRef.current = rainSource;

    const binauralGain = ctx.createGain();
    binauralGain.gain.setValueAtTime(binauralVol / 100, ctx.currentTime);
    binauralGain.connect(masterGain);
    binauralGainRef.current = binauralGain;

    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();
    oscL.type = "sine";
    oscL.frequency.value = 150;
    oscR.type = "sine";
    oscR.frequency.value = 155;

    const merger = ctx.createChannelMerger(2);
    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);
    merger.connect(binauralGain);

    oscL.start(0);
    oscR.start(0);

    oscLRef.current = oscL;
    oscRRef.current = oscR;

    setIsAudioPlaying(true);
  };

  const stopAudio = () => {
    try {
      brownSourceRef.current?.stop();
      rainSourceRef.current?.stop();
      oscLRef.current?.stop();
      oscRRef.current?.stop();
    } catch (e) {}

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }

    setIsAudioPlaying(false);
  };

  const toggleAudio = () => {
    if (isAudioPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  const updateVolume = (type: "master" | "brown" | "rain" | "binaural", val: number) => {
    if (type === "master") {
      setMasterVol(val);
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setValueAtTime(val / 100, audioCtxRef.current.currentTime);
      }
    } else if (type === "brown") {
      setBrownVol(val);
      if (brownGainRef.current && audioCtxRef.current) {
        brownGainRef.current.gain.setValueAtTime(val / 100, audioCtxRef.current.currentTime);
      }
    } else if (type === "rain") {
      setRainVol(val);
      if (rainGainRef.current && audioCtxRef.current) {
        rainGainRef.current.gain.setValueAtTime(val / 100, audioCtxRef.current.currentTime);
      }
    } else if (type === "binaural") {
      setBinauralVol(val);
      if (binauralGainRef.current && audioCtxRef.current) {
        binauralGainRef.current.gain.setValueAtTime(val / 100, audioCtxRef.current.currentTime);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const renderTrackCard = (track: Track, tasks: Task[], i: number) => {
    const done = tasks.filter((t) => t.done).length;
    return (
      <motion.section
        key={track.id}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: (3 + i) * 0.06 }}
        whileHover={{ y: -3, transition: springSoft }}
        className="bg-cream-raised border hairline rounded-sm shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b hairline">
          <span className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5"
              style={{ backgroundColor: track.accent }}
              aria-hidden
            />
            <span className="label" style={{ color: track.accent }}>
              {track.tag}
            </span>
          </span>
          <span className="font-display text-xs font-bold text-coffee">
            {done}/{tasks.length}
          </span>
        </div>
        <div className="px-4 py-1">
          {tasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              editable
              onEdit={(task) => setTaskModal({ open: true, task })}
            />
          ))}
        </div>

        {track.id === "track-interview" && (
          <div className="border-t hairline pt-3 px-4 pb-3 bg-olive/[0.02] space-y-2 mt-2">
            <div className="label text-[9px] text-olive-deep font-bold uppercase tracking-wider">
              💡 Startup Pitch &amp; STAR Helper
            </div>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] leading-snug">
                <input
                  type="checkbox"
                  checked={!!pitchChecked.pitch}
                  onChange={() => togglePitch("pitch")}
                  className="mt-0.5 h-3 w-3 rounded-sm border border-coffee/30 text-olive focus:ring-0 focus:outline-none accent-olive"
                />
                <span className={pitchChecked.pitch ? "line-through opacity-50 text-coffee-soft" : "text-espresso font-medium"}>
                  30s Elevator Pitch: "Software Developer from Nexus Automech..."
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] leading-snug">
                <input
                  type="checkbox"
                  checked={!!pitchChecked.ros}
                  onChange={() => togglePitch("ros")}
                  className="mt-0.5 h-3 w-3 rounded-sm border border-coffee/30 text-olive focus:ring-0 focus:outline-none accent-olive"
                />
                <span className={pitchChecked.ros ? "line-through opacity-50 text-coffee-soft" : "text-espresso font-medium"}>
                  STAR Story: Autonomous Robotics Latency (500ms → 150ms)
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] leading-snug">
                <input
                  type="checkbox"
                  checked={!!pitchChecked.rag}
                  onChange={() => togglePitch("rag")}
                  className="mt-0.5 h-3 w-3 rounded-sm border border-coffee/30 text-olive focus:ring-0 focus:outline-none accent-olive"
                />
                <span className={pitchChecked.rag ? "line-through opacity-50 text-coffee-soft" : "text-espresso font-medium"}>
                  STAR Story: RAG intent router &amp; circuit breakers
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] leading-snug">
                <input
                  type="checkbox"
                  checked={!!pitchChecked.values}
                  onChange={() => togglePitch("values")}
                  className="mt-0.5 h-3 w-3 rounded-sm border border-coffee/30 text-olive focus:ring-0 focus:outline-none accent-olive"
                />
                <span className={pitchChecked.values ? "line-through opacity-50 text-coffee-soft" : "text-espresso font-medium"}>
                  Culture: Why YC / Series A high-ownership startups?
                </span>
              </label>
            </div>
          </div>
        )}

        {track.id === "track-django" && (
          <div className="border-t hairline pt-2.5 px-4 pb-3 bg-olive/[0.02] mt-2 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setQueryModal(true)}
              className="w-full text-center text-[11px] py-1 font-semibold"
            >
              🔍 Open Query Performance Simulator
            </Button>
          </div>
        )}
      </motion.section>
    );
  };

  const goToPrev = () => {
    const i = days.findIndex((d) => d.id === day.id);
    if (i > 0) setActiveId(days[i - 1].id);
  };
  const goToNext = () => {
    const i = days.findIndex((d) => d.id === day.id);
    if (i < days.length - 1) setActiveId(days[i + 1].id);
  };

  return (
    <div className={`transition-all duration-500 rounded-sm ${activeSpace === "cyberpunk" ? "space-cyberpunk p-4" : activeSpace === "nasa" ? "space-nasa p-4" : ""} ${showGlitch ? "distraction-glitch-active" : ""}`}>
      {/* Glitch Overlay Indicator */}
      {showGlitch && (
        <div className="fixed inset-0 pointer-events-none border-[12px] border-clay z-[9999] bg-clay/[0.04] animate-[pulse_0.2s_infinite] flex items-center justify-center">
          <div className="bg-espresso text-clay font-mono font-bold text-xs px-3.5 py-2 rounded-sm border border-clay shadow-lg animate-bounce uppercase tracking-wide">
            ⚠ DISTRACTION ALERT: -$100 MOCK CAPITAL / RIVAL EDGE +3%
          </div>
        </div>
      )}
      <CarryoverCard />

      {/* Day rail */}
      <DayRail days={days} activeId={day.id} onPick={setActiveId} />

      {/* Aesthetic Workspace Space Switcher */}
      <div className="reveal mt-4 flex flex-wrap items-center justify-between gap-3 border-b hairline pb-4" style={delay(0.2)}>
        <div className="flex items-center gap-2">
          <span className="label text-[10px] text-coffee uppercase font-bold tracking-wider">Workspace Ambience:</span>
          <div className="flex gap-1.5">
            {SPACES.map((sp) => (
              <button
                key={sp.id}
                onClick={() => handleSpaceChange(sp.id)}
                className={`px-3 py-1.5 text-[10px] font-bold font-mono tracking-tight transition-all rounded-sm border ${
                  activeSpace === sp.id
                    ? "bg-espresso text-cream-raised border-espresso"
                    : "bg-cream-raised text-coffee border-coffee/20 hover:border-coffee"
                }`}
              >
                {sp.id === "library" ? "📜 Library" : sp.id === "cyberpunk" ? "⚡ Terminal" : "🚀 NASA"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-coffee bg-cream-deep/40 px-2 py-1.5 rounded-sm">
            🚨 Interrupted: {pausesCount} | Distraction Cost: -${pausesCount * 100}
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="reveal mt-8 grid grid-cols-12 items-end gap-4 border-b hairline pb-7" style={delay(0)}>
        <div className="col-span-12 sm:col-span-3">
          <div className="label text-coffee mb-1">Day</div>
          <div className="font-display text-[5.5rem] leading-[0.82] font-extrabold tracking-tightest text-espresso">
            {String(day.index).padStart(2, "0")}
          </div>
          <div className="label text-olive-deep mt-2">{day.date}</div>
        </div>
        <div className="col-span-12 sm:col-span-9">
          <PressIn
            as="h1"
            className="block font-display text-2xl sm:text-[2rem] font-bold leading-[1.05] tracking-tightest text-espresso text-balance"
          >
            {day.title}
          </PressIn>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <ProgressBar pct={prog.pct} />
            </div>
            <span className="font-display text-sm font-bold text-coffee">
              {prog.done}/{prog.total}
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => setDayModal(true)}>
                Edit day
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Goal / Must / Focus stats */}
      <div className="mt-6 grid grid-cols-12 gap-3 items-stretch">
        {/* Main Goal Card */}
        <div
          className="reveal col-span-12 lg:col-span-5 bg-olive text-cream-raised p-5 flex flex-col justify-between min-h-[160px] rounded-sm shadow-sm"
          style={delay(1)}
        >
          <div>
            <div className="label text-cream-raised/75 mb-2.5">Main goal</div>
            <p className="font-serif italic text-[15px] sm:text-[16px] text-cream-raised leading-relaxed pl-3 border-l-2 border-cream-raised/40">
              “{day.goal}”
            </p>
          </div>
        </div>

        {/* Must Complete Card */}
        <div
          className="reveal col-span-12 lg:col-span-4 border border-clay/40 bg-clay/[0.07] p-5 flex flex-col justify-between min-h-[160px] rounded-sm shadow-sm"
          style={delay(2)}
        >
          <div>
            <div className="label text-clay-deep mb-2.5">Must complete today</div>
            {mustItems.length > 0 ? (
              <div className="space-y-2">
                {mustItems.map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 cursor-pointer select-none py-0.5 hover:opacity-85 transition-opacity"
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedMusts[idx]}
                      onChange={() => toggleMust(idx)}
                      className="mt-1 h-3.5 w-3.5 rounded-sm border border-clay/40 bg-cream-base text-clay focus:ring-0 focus:ring-offset-0 focus:outline-none transition-colors accent-clay"
                    />
                    <span
                      className={`text-xs sm:text-[13px] leading-relaxed transition-all duration-300 ${
                        checkedMusts[idx] ? "line-through opacity-50 text-coffee-soft" : "text-espresso font-medium"
                      }`}
                    >
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-[13px] leading-relaxed text-espresso">{day.must}</p>
            )}
          </div>
        </div>

        {/* Day's Focus Stats Card */}
        <div
          className="reveal col-span-12 lg:col-span-3 border border-olive/30 bg-olive/[0.03] p-5 flex flex-col justify-between min-h-[160px] rounded-sm shadow-sm"
          style={delay(3)}
        >
          <div>
            <div className="label text-olive-deep mb-1.5">Day's Focus Time</div>
            <div className="font-display text-4xl font-extrabold tracking-tightest text-espresso mb-1">
              {totalFocusMinutes > 0 ? `${totalFocusMinutes}m` : "0m"}
            </div>
            <p className="text-xs text-coffee leading-relaxed">
              {daySessions.length > 0
                ? `${daySessions.length} block${daySessions.length > 1 ? "s" : ""} completed`
                : "No focus blocks completed yet."}
            </p>
          </div>
          {daySessions.length > 0 && (
            <div className="mt-3 max-h-[60px] overflow-y-auto no-scrollbar border-t border-olive/10 pt-2 text-[11px] text-coffee/85 space-y-1">
              {daySessions.slice(0, 3).map((s) => {
                const taskText = state.tasks.find((t) => t.id === s.taskId)?.text ?? "Focus session";
                return (
                  <div key={s.id} className="truncate">
                    • {s.minutes}m: {taskText}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Startup War Room: Equity Accumulator & Rival Battle */}
      <div className="reveal mt-6 border border-clay-deep/30 bg-clay-deep/[0.015] p-5 rounded-sm shadow-sm" style={delay(3.5)}>
        <div className="flex items-center justify-between border-b border-clay-deep/15 pb-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isTimerRunning ? "bg-olive animate-pulse" : "bg-clay animate-pulse"}`} />
            <span className="label text-[11px] font-bold text-espresso tracking-wide">
              {isTimerRunning ? "WAR ROOM STATUS: TRANSMITTING ACTIVE CAPITAL ROUND" : "WAR ROOM STATUS: IDLE"}
            </span>
          </div>
          <span className="label text-[10px] text-clay-deep font-mono tracking-widest uppercase">
            Study-to-Earn Campaign
          </span>
        </div>

        <div className="grid grid-cols-12 gap-6 items-stretch">
          {/* Equity / Funding Accumulator */}
          <div className="col-span-12 lg:col-span-4 space-y-3 border-b lg:border-b-0 lg:border-r border-coffee/15 pb-4 lg:pb-0 lg:pr-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="label text-coffee mb-0.5">Mock Founder Equity / Capital</h4>
                {isTimerRunning && (
                  <span className="text-[9px] font-mono font-bold text-olive-deep bg-olive/10 px-1.5 py-0.5 rounded-sm animate-pulse">
                    +$25/sec
                  </span>
                )}
              </div>
              
              <div className="flex items-baseline gap-2.5 mt-1">
                <span className="font-mono text-[2.5rem] font-bold leading-none text-clay-deep tracking-tight">
                  ${mockCapital.toLocaleString()}
                </span>
                <span className="text-[10px] text-coffee font-mono">USD</span>
              </div>
            </div>

            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-[10px] text-coffee">
                <span>Daily Funding Cap ($30,000)</span>
                <span className="font-bold">{Math.min(100, Math.round((mockCapital / 30000) * 100))}%</span>
              </div>
              <ProgressBar pct={Math.min(100, (mockCapital / 30000) * 100)} />
            </div>

            <p className="text-[10px] leading-normal text-coffee-soft mt-1">
              {isTimerRunning 
                ? "Focus timer active. Accumulating mock equity. Pausing will deduct a -$100 distraction penalty!" 
                : "Timer is idle. Start study block to generate capital and secure YC candidate matching perks."}
            </p>
          </div>

          {/* YPT-style Cohort Study Lobby */}
          <div className="col-span-12 lg:col-span-4 space-y-3 border-b lg:border-b-0 lg:border-r border-coffee/15 pb-4 lg:pb-0 lg:pr-6 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <h4 className="label text-coffee">Cohort Study Lobby</h4>
              <span className="text-[9px] font-bold text-olive-deep bg-olive/10 px-1.5 py-0.5 rounded-sm">
                👥 5 Active
              </span>
            </div>

            <div className="bg-cream-base/50 p-2.5 border border-coffee/10 rounded-sm space-y-1 flex-grow overflow-y-auto max-h-[110px] no-scrollbar">
              {sortedCohort.map((item, idx) => (
                <div 
                  key={item.name} 
                  className={`flex items-center justify-between text-[11px] py-1 border-b border-coffee/5 last:border-0 ${
                    item.isYou ? "font-bold text-olive-deep bg-olive/10 px-1 rounded-sm" : "text-espresso"
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5 max-w-[140px]">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      item.status === "active" ? "bg-olive animate-pulse" : item.status === "break" ? "bg-clay" : "bg-coffee/40"
                    }`} />
                    <span>#{idx + 1} {item.name.split(" ")[0]}</span>
                  </span>
                  <span className="text-[9px] text-coffee-soft italic truncate max-w-[80px]">{item.action}</span>
                  <span className="font-mono text-[11px] font-bold">{item.minutes}m</span>
                </div>
              ))}
            </div>

            <div className="text-[9px] text-coffee-soft leading-tight mt-1 flex justify-between">
              <span>Your Ranking: Rank #{sortedCohort.findIndex(c => c.isYou) + 1} of 5</span>
              <span>Lobby: YC Batch Prep</span>
            </div>
          </div>

          {/* Rival Battle Streak Tracker */}
          <div className="col-span-12 lg:col-span-4 space-y-3 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <h4 className="label text-coffee font-bold">Rival Candidate Offer Race</h4>
              {rivalBonus > 0 && (
                <span className="text-[9px] font-bold text-clay bg-clay/10 px-1.5 py-0.5 rounded-sm animate-pulse">
                  Vikram Edge +{rivalBonus}%
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-end text-[10px]">
                <span className="font-bold text-espresso">You ({winProbability.you}%)</span>
                <span className="font-bold text-coffee-soft">Vikram S. ({winProbability.rival}%)</span>
              </div>
              
              <div className="h-2 w-full flex rounded-full overflow-hidden border border-coffee/20">
                <div 
                  className="bg-olive transition-all duration-500" 
                  style={{ width: `${winProbability.you}%` }}
                />
                <div 
                  className="bg-clay transition-all duration-500" 
                  style={{ width: `${winProbability.rival}%` }}
                />
              </div>
            </div>

            {/* Match Logs Feed */}
            <div className="bg-cream-base/50 p-2 border border-coffee/10 rounded-sm space-y-1 max-h-[75px] overflow-y-auto no-scrollbar">
              <div className="label text-[8px] text-coffee-soft uppercase tracking-wider">Live Battle Log</div>
              <div className="space-y-1 text-[10px] font-mono text-espresso/90">
                {rivalLogs.slice(0, 3).map((log, idx) => (
                  <div key={idx} className="flex gap-1.5">
                    <span className="text-clay/80 select-none">[{log.time}]</span>
                    <span className="truncate">{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionDivider className="mt-6" />

      {/* Task sections — dynamically balanced 2-column flex stacks to prevent empty vertical space */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Column 1 (Left) */}
        <div className="flex flex-col gap-4">
          {balancedCols.col1.map((item, idx) => renderTrackCard(item.track, item.tasks, idx))}
        </div>

        {/* Column 2 (Right) */}
        <div className="flex flex-col gap-4">
          {balancedCols.col2.map((item, idx) => renderTrackCard(item.track, item.tasks, idx + 2))}
        </div>
      </div>

      <SectionDivider className="mt-6" />

      {/* Visual Startup Office & Soundscape Synthesizer row */}
      <div className="mt-6 grid grid-cols-12 gap-6 items-stretch">
        {/* Virtual Startup Office (col-span-8) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col">
          <div className="border border-coffee/30 bg-cream-raised flex flex-col h-full rounded-sm shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b hairline bg-cream-base/50">
              <span className="label text-espresso">🌱 Virtual YC Startup Office</span>
              <span className="text-[10px] text-coffee font-mono font-bold">
                Office Level: {daySessions.length >= 5 ? "Max (5/5)" : `${daySessions.length}/5`}
              </span>
            </div>
            <div className="p-4 flex flex-col sm:flex-row gap-5 items-center flex-grow">
              <div className="w-full sm:w-1/2">
                <StartupOffice level={daySessions.length} />
              </div>
              <div className="w-full sm:w-1/2 space-y-2.5">
                <h4 className="font-display text-sm font-bold text-espresso">Build your workspace in real-time</h4>
                <p className="text-[11px] leading-relaxed text-coffee">
                  Every 25-minute Pomodoro study session completed today unlocks new developer equipment for your virtual office:
                </p>
                <div className="space-y-1.5 text-[10px] text-espresso font-mono leading-tight">
                  <div className={daySessions.length >= 1 ? "text-olive-deep font-bold" : "opacity-50"}>
                    {daySessions.length >= 1 ? "✓ Lvl 1: Desk & Chair unlocked" : "• Lvl 1: Desk & Chair (1 focus block)"}
                  </div>
                  <div className={daySessions.length >= 2 ? "text-olive-deep font-bold" : "opacity-50"}>
                    {daySessions.length >= 2 ? "✓ Lvl 2: Glowing Laptop unlocked" : "• Lvl 2: Glowing Laptop (2 focus blocks)"}
                  </div>
                  <div className={daySessions.length >= 3 ? "text-olive-deep font-bold" : "opacity-50"}>
                    {daySessions.length >= 3 ? "✓ Lvl 3: Dual Monitors & Mech Keyboard" : "• Lvl 3: Dual Monitors & Keyboard (3 blocks)"}
                  </div>
                  <div className={daySessions.length >= 4 ? "text-olive-deep font-bold" : "opacity-50"}>
                    {daySessions.length >= 4 ? "✓ Lvl 4: Glowing Server Rack online" : "• Lvl 4: Glowing Server Rack (4 blocks)"}
                  </div>
                  <div className={daySessions.length >= 5 ? "text-olive-deep font-bold" : "opacity-50"}>
                    {daySessions.length >= 5 ? "✓ Lvl 5: Autonomous Robot BLINKING" : "• Lvl 5: Robotics Companion (5 blocks)"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Founder's Soundscape Synthesizer (col-span-4) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col">
          <div className="border border-coffee/30 bg-cream-raised flex flex-col h-full rounded-sm shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b hairline bg-cream-base/50">
              <span className="label text-espresso">🎧 Soundscape Synthesizer</span>
              <span className="text-[10px] text-coffee font-mono font-bold uppercase tracking-wider">Web Audio</span>
            </div>
            <div className="p-4 space-y-4 flex-grow flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-coffee font-medium">Binaural &amp; Noise Generator</span>
                <Button
                  variant={isAudioPlaying ? "solid" : "outline"}
                  onClick={toggleAudio}
                  className="!py-1 !px-2.5 !text-[10px] font-bold shrink-0"
                >
                  {isAudioPlaying ? "⏸ Pause Audio" : "▶ Play Audio"}
                </Button>
              </div>

              <div className="space-y-3 pt-2.5">
                {/* Master Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-coffee uppercase">
                    <span>Master Volume</span>
                    <span>{masterVol}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={masterVol}
                    onChange={(e) => updateVolume("master", parseInt(e.target.value))}
                    className="w-full h-1 bg-cream-deep rounded-lg appearance-none cursor-pointer accent-clay"
                  />
                </div>

                {/* Brown Noise */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-coffee uppercase">
                    <span>Deep Brown Noise</span>
                    <span>{brownVol}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={brownVol}
                    onChange={(e) => updateVolume("brown", parseInt(e.target.value))}
                    className="w-full h-1 bg-cream-deep rounded-lg appearance-none cursor-pointer accent-olive"
                  />
                </div>

                {/* Rain */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-coffee uppercase">
                    <span>Rain Canopy</span>
                    <span>{rainVol}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={rainVol}
                    onChange={(e) => updateVolume("rain", parseInt(e.target.value))}
                    className="w-full h-1 bg-cream-deep rounded-lg appearance-none cursor-pointer accent-olive"
                  />
                </div>

                {/* Binaural Beat */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-coffee uppercase">
                    <span>Binaural Beat (5Hz Alpha)</span>
                    <span>{binauralVol}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={binauralVol}
                    onChange={(e) => updateVolume("binaural", parseInt(e.target.value))}
                    className="w-full h-1 bg-cream-deep rounded-lg appearance-none cursor-pointer accent-olive"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionDivider className="mt-6" />

      {/* Interactive Row: Scratchpad & Shutdown Reflection side-by-side */}
      <div className="mt-6 grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-7">
          <Scratchpad day={day} updateDay={state.updateDay} />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <ReflectionCard />
        </div>
      </div>

      <SectionDivider className="mt-6" />

      {/* Result */}
      <div
        className="reveal mt-6 bg-espresso text-cream-raised p-6"
        style={delay(3 + tracks.length)}
      >
        <div className="label text-cream-raised/70 mb-2">Day ends when you can do this</div>
        <p className="max-w-3xl font-display text-lg sm:text-xl font-semibold leading-snug tracking-tightest text-pretty">
          {day.result}
        </p>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={goToPrev}>
          ← Prev day
        </Button>
        <Button variant="outline" onClick={goToNext}>
          Next day →
        </Button>
        <Button variant="solid" className="ml-auto" onClick={() => setTaskModal({ open: true })}>
          + Add task to this day
        </Button>
      </div>

      {/* Modals */}
      <Modal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false })}
        title={taskModal.task ? "Edit task" : "Add task"}
      >
        <TaskForm
          task={taskModal.task}
          defaultDayId={day.id}
          tracks={tracks}
          days={days}
          onDone={() => setTaskModal({ open: false })}
        />
      </Modal>
      <Modal open={dayModal} onClose={() => setDayModal(false)} title="Edit day">
        <DayForm day={day} onDone={() => setDayModal(false)} />
      </Modal>

      <Modal open={queryModal} onClose={() => setQueryModal(false)} title="Postgres Profiling &amp; Django Query Simulator">
        <div className="space-y-4 text-espresso max-w-xl">
          <div className="bg-cream-base border border-coffee/15 p-3.5 rounded-sm space-y-2.5">
            <label className="label text-coffee block text-[10px] uppercase font-bold tracking-wider">Select Django Query Statement</label>
            <select
              value={simQuery}
              onChange={(e) => setSimQuery(e.target.value)}
              className="w-full bg-cream-raised border hairline px-2.5 py-1.5 text-xs text-espresso focus:outline-none rounded-sm font-mono"
            >
              <option value="n1">Candidate.objects.all() — [Classic N+1 Loop]</option>
              <option value="select_related">Candidate.objects.select_related('company') — [SQL JOIN Optimization]</option>
              <option value="prefetch_related">Candidate.objects.prefetch_related('skills') — [Optimized IN Multi-Query]</option>
              <option value="only">Candidate.objects.only('name', 'email') — [Column Projection Optimization]</option>
            </select>
          </div>

          {/* Database Traffic Flow Visualization */}
          <div className="bg-cream-raised border border-coffee/20 p-4 rounded-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[110px]">
            <div className="flex items-center gap-12 z-10 w-full justify-around px-4">
              {/* Django server node */}
              <div className="flex flex-col items-center">
                <div className="h-9 w-9 bg-olive text-cream-raised flex items-center justify-center font-bold font-mono text-[10px] rounded-full shadow border border-olive-deep">
                  App
                </div>
                <span className="text-[9px] label mt-1.5 text-coffee font-bold">Django Server</span>
              </div>

              {/* Server-to-DB Connection cable/traffic */}
              <div className="flex flex-col items-center relative flex-1 min-w-[70px]">
                <div className="h-[2px] w-full bg-coffee/20 relative">
                  {/* Traffic particle dots */}
                  {simQuery === "n1" ? (
                    <>
                      <div className="absolute h-2.5 w-2.5 bg-clay rounded-full -top-[4px] left-0 animate-[ping_1.5s_infinite]" />
                      <div className="absolute h-2.5 w-2.5 bg-clay rounded-full -top-[4px] left-1/3 animate-[ping_1.5s_infinite_delay-300ms]" />
                      <div className="absolute h-2.5 w-2.5 bg-clay rounded-full -top-[4px] left-2/3 animate-[ping_1.5s_infinite_delay-600ms]" />
                    </>
                  ) : (
                    <div className="absolute h-2.5 w-2.5 bg-olive rounded-full -top-[4px] left-1/2 -translate-x-1/2 animate-[ping_2s_infinite]" />
                  )}
                </div>
                <span className="text-[8px] font-mono text-coffee-soft mt-1.5 uppercase tracking-wider text-center font-bold">
                  {simQuery === "n1" ? "101 SQL roundtrips (Spam)" : simQuery === "prefetch_related" ? "2 DB hits" : "1 DB hit (JOIN)"}
                </span>
              </div>

              {/* PostgreSQL database node */}
              <div className="flex flex-col items-center">
                <div className="h-9 w-9 bg-clay-deep text-cream-raised flex items-center justify-center font-bold font-mono text-[10px] rounded-full shadow border border-clay">
                  DB
                </div>
                <span className="text-[9px] label mt-1.5 text-coffee font-bold">PostgreSQL</span>
              </div>
            </div>
          </div>

          {/* Metrics box */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="border border-coffee/15 bg-cream-base p-2 rounded-sm">
              <div className="label text-[8px] text-coffee-soft uppercase font-bold tracking-wider">Database Hits</div>
              <div className={`font-mono text-sm font-bold mt-1 ${simQuery === "n1" ? "text-clay-deep" : "text-olive-deep"}`}>
                {simQuery === "n1" ? "101 queries" : simQuery === "prefetch_related" ? "2 queries" : "1 query"}
              </div>
            </div>
            <div className="border border-coffee/15 bg-cream-base p-2 rounded-sm">
              <div className="label text-[8px] text-coffee-soft uppercase font-bold tracking-wider">Latency (Avg)</div>
              <div className={`font-mono text-sm font-bold mt-1 ${simQuery === "n1" ? "text-clay-deep" : "text-olive-deep"}`}>
                {simQuery === "n1" ? "540ms" : simQuery === "prefetch_related" ? "32ms" : "14ms"}
              </div>
            </div>
            <div className="border border-coffee/15 bg-cream-base p-2 rounded-sm">
              <div className="label text-[8px] text-coffee-soft uppercase font-bold tracking-wider">CPU Cost</div>
              <div className={`font-mono text-sm font-bold mt-1 ${simQuery === "n1" ? "text-clay-deep" : "text-olive-deep"}`}>
                {simQuery === "n1" ? "82% Spike" : "4.2% Normal"}
              </div>
            </div>
            <div className="border border-coffee/15 bg-cream-base p-2 rounded-sm">
              <div className="label text-[8px] text-coffee-soft uppercase font-bold tracking-wider">Payload Size</div>
              <div className="font-mono text-sm font-bold text-espresso mt-1">
                {simQuery === "n1" ? "340 KB" : simQuery === "only" ? "12 KB" : "85 KB"}
              </div>
            </div>
          </div>

          {/* Generated SQL query console block */}
          <div className="space-y-1">
            <div className="label text-[8px] text-coffee-soft uppercase font-bold tracking-wider">Generated SQL Queries Console</div>
            <pre className="p-3 bg-espresso text-cream-raised font-mono text-[10px] leading-relaxed overflow-x-auto rounded-sm border hairline border-coffee/30 max-h-[120px] overflow-y-auto no-scrollbar">
              {simQuery === "n1"
                ? `-- Query 1 (Fetch all candidates)\nSELECT id, name, email, company_id FROM core_candidate;\n\n-- Loop Queries (Fires 100 times for each company)\nSELECT id, name, domain FROM core_company WHERE id = 1;\nSELECT id, name, domain FROM core_company WHERE id = 2;\n-- [Truncated 98 matching query roundtrips...]`
                : simQuery === "select_related"
                ? `-- SQL INNER JOIN Optimization\nSELECT \n  core_candidate.id, core_candidate.name, core_candidate.email, \n  core_company.id, core_company.name, core_company.domain\nFROM core_candidate\nINNER JOIN core_company \nON core_candidate.company_id = core_company.id;`
                : simQuery === "prefetch_related"
                ? `-- Query 1 (Fetch candidates)\nSELECT id, name, email FROM core_candidate;\n\n-- Query 2 (Fetch linked skills in a single select IN)\nSELECT core_skill.id, core_skill.name, candidate_skills.candidate_id \nFROM core_skill \nINNER JOIN candidate_skills \nON core_skill.id = candidate_skills.skill_id \nWHERE candidate_skills.candidate_id IN (1, 2, 3, 4, 5, ... 100);`
                : `-- SQL Narrow Projection Query\nSELECT id, name, email FROM core_candidate;`}
            </pre>
          </div>

          {/* Detailed Performance Tuning explanation */}
          <div className="bg-olive/[0.02] border border-olive/15 p-3.5 rounded-sm space-y-1 text-[11px] leading-relaxed">
            <div className="label text-[9px] text-olive-deep uppercase font-bold">Tuning Audit &amp; Explanation</div>
            <p className="text-coffee-soft">
              {simQuery === "n1"
                ? "🚨 The N+1 Query Loop occurs when foreign key relationships are accessed inside loops without eager loading. Django fires a database hit per iteration, clogging Postgres connection pool. Slashing latency requires select_related or prefetch_related."
                : simQuery === "select_related"
                ? "✅ select_related performs a SQL JOIN at the database level. It retrieves both candidate and company in one database hit. Use for ForeignKey or OneToOne relationships."
                : simQuery === "prefetch_related"
                ? "✅ prefetch_related executes two queries and joins records inside Python memory, avoiding raw row duplication in database returns. Ideal for ManyToMany or reverse relationships."
                : "✅ only() ensures Django retrieves only required columns. Saves network transmission payload weight, protecting memory limits when processing massive database collections."}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- Carryover: yesterday's "one thing" ---------- */

function CarryoverCard() {
  const yKey = yesterdayKey(new Date());
  const oneThing = usePlanner(
    (s) => s.reflections.find((r) => r.date === yKey)?.oneThing ?? "",
  );
  const [dismissed, setDismissed] = useState(false);

  if (!oneThing.trim() || dismissed) return null;

  return (
    <div className="reveal mb-4 flex items-start gap-3 border border-olive/40 bg-olive/[0.08] px-4 py-3">
      <div className="min-w-0">
        <div className="label text-olive-deep mb-0.5">Yesterday&rsquo;s one thing</div>
        <p className="text-sm leading-relaxed text-espresso">{oneThing}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-auto shrink-0 text-coffee hover:text-espresso text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

/* ---------- Day rail ---------- */

function DayRail({
  days,
  activeId,
  onPick,
}: {
  days: Day[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  const state = usePlanner();
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto pb-1">
      {days.map((d) => {
        const p = dayProgress(state, d.id);
        const active = d.id === activeId;
        const complete = p.total > 0 && p.done === p.total;
        return (
          <motion.button
            key={d.id}
            onClick={() => onPick(d.id)}
            whileTap={{ scale: 0.92 }}
            whileHover={active ? undefined : { y: -2 }}
            transition={springSoft}
            className={`group relative shrink-0 px-3 py-2 transition-colors duration-200 ${
              active
                ? "bg-espresso text-cream-raised"
                : "bg-cream-raised text-coffee hover:text-espresso border hairline"
            }`}
          >
            <span className="font-display text-sm font-bold tracking-tightest">
              {String(d.index).padStart(2, "0")}
            </span>
            <span
              className="absolute bottom-0 left-0 h-[3px]"
              style={{
                width: `${p.pct}%`,
                backgroundColor: complete ? "var(--olive)" : active ? "var(--clay)" : "var(--olive)",
              }}
            />
          </motion.button>
        );
      })}
    </div>
  );
}

/* ---------- Daily Notes & Scratchpad ---------- */

function Scratchpad({
  day,
  updateDay,
}: {
  day: Day;
  updateDay: (id: string, patch: Partial<Omit<Day, "id">>) => void;
}) {
  const [text, setText] = useState(day.notes ?? "");

  // Re-sync if the active day changes
  useEffect(() => {
    setText(day.notes ?? "");
  }, [day.id, day.notes]);

  const handleBlur = () => {
    if (text !== (day.notes ?? "")) {
      updateDay(day.id, { notes: text });
    }
  };

  return (
    <div className="flex flex-col h-full border border-coffee/30 bg-cream-raised flex-1">
      <div className="flex items-center justify-between px-4 py-3 border-b hairline">
        <span className="label text-espresso">Notes &amp; Scratchpad</span>
        <span className="text-[10px] text-coffee/70">Auto-saved</span>
      </div>
      <div className="flex-grow p-4 flex">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          placeholder={`// Jot down code snippets, terminal commands, or study notes for Day ${day.index}...\n// Auto-saves on click outside.`}
          className="w-full min-h-[220px] bg-cream-base border border-coffee/15 p-4 font-mono text-[13px] leading-relaxed text-espresso bg-grid-paper focus:outline-none resize-y"
        />
      </div>
    </div>
  );
}

function StartupOffice({ level }: { level: number }) {
  return (
    <div className="border border-coffee/20 bg-cream-base p-4 rounded-sm flex items-center justify-center min-h-[220px]">
      <svg viewBox="0 0 400 240" className="w-full h-auto max-w-[340px]" aria-label="Virtual Startup Office Map">
        {/* Floor and Walls Isometric View */}
        <polygon points="200,160 50,80 200,0 350,80" fill="var(--cream-deep)" stroke="var(--coffee-soft)" strokeWidth="1" opacity="0.3" />
        <polygon points="50,80 200,160 200,240 50,160" fill="var(--cream-raised)" stroke="var(--coffee-soft)" strokeWidth="1" />
        <polygon points="200,160 350,80 350,160 200,240" fill="var(--cream-deep)" stroke="var(--coffee-soft)" strokeWidth="1" />

        {/* YC Sticker / Poster on Left Wall */}
        <polygon points="100,105 140,85 140,115 100,135" fill="var(--clay)" opacity="0.8" />
        <text x="120" y="112" transform="rotate(-15, 120, 112)" fill="var(--cream-raised)" className="font-sans font-bold text-[10px]" textAnchor="middle">
          YC
        </text>

        {/* Level 1: Adds Desk and Chair */}
        {level >= 1 && (
          <g>
            {/* Desk */}
            <polygon points="120,130 180,100 280,150 220,180" fill="var(--coffee-soft)" stroke="var(--espresso)" strokeWidth="1" />
            <polygon points="120,130 220,180 220,195 120,145" fill="var(--coffee)" stroke="var(--espresso)" strokeWidth="1" />
            <polygon points="220,180 280,150 280,165 220,195" fill="var(--coffee)" stroke="var(--espresso)" strokeWidth="1" />
            {/* Desk Legs */}
            <line x1="122" y1="145" x2="122" y2="175" stroke="var(--espresso)" strokeWidth="2.5" />
            <line x1="220" y1="195" x2="220" y2="225" stroke="var(--espresso)" strokeWidth="2.5" />
            <line x1="278" y1="165" x2="278" y2="195" stroke="var(--espresso)" strokeWidth="2.5" />
            <line x1="180" y1="115" x2="180" y2="145" stroke="var(--espresso)" strokeWidth="2" />

            {/* Chair */}
            <polygon points="160,185 185,172 200,180 175,193" fill="var(--espresso)" />
            <line x1="175" y1="193" x2="175" y2="215" stroke="var(--espresso)" strokeWidth="2" />
            <line x1="160" y1="185" x2="160" y2="207" stroke="var(--espresso)" strokeWidth="2" />
            <line x1="185" y1="172" x2="185" y2="194" stroke="var(--espresso)" strokeWidth="2" />
            <line x1="200" y1="180" x2="200" y2="202" stroke="var(--espresso)" strokeWidth="2" />
            {/* Backrest */}
            <polygon points="160,160 185,147 185,172 160,185" fill="var(--espresso)" opacity="0.9" />
          </g>
        )}

        {/* Level 2: Laptop */}
        {level >= 2 && (
          <g>
            {/* Glowing Laptop Base */}
            <polygon points="180,140 195,132 210,140 195,148" fill="var(--espresso)" />
            {/* Laptop Screen */}
            <polygon points="195,132 210,140 210,123 195,115" fill="var(--olive)" />
            {/* Glow light reflection */}
            <ellipse cx="205" cy="148" rx="8" ry="4" fill="var(--olive)" opacity="0.35" className="animate-pulse" />
          </g>
        )}

        {/* Level 3: Dual Monitors & Mechanical Keyboard */}
        {level >= 3 && (
          <g>
            {/* Left Monitor Stand */}
            <line x1="215" y1="125" x2="215" y2="135" stroke="var(--espresso)" strokeWidth="2" />
            <polygon points="200,105 220,95 220,118 200,128" fill="var(--espresso)" />
            <polygon points="202,108 218,100 218,115 202,123" fill="var(--olive)" />

            {/* Right Monitor Stand */}
            <line x1="235" y1="135" x2="235" y2="145" stroke="var(--espresso)" strokeWidth="2" />
            <polygon points="222,116 242,106 242,129 222,139" fill="var(--espresso)" />
            <polygon points="224,119 240,111 240,126 224,134" fill="var(--olive)" />

            {/* Glowing Keyboard */}
            <polygon points="190,149 198,145 204,148 196,152" fill="var(--clay)" />
          </g>
        )}

        {/* Level 4: Blinking Server Rack */}
        {level >= 4 && (
          <g>
            {/* Rack Cabinet */}
            <polygon points="310,120 335,107 335,145 310,158" fill="var(--espresso)" />
            <polygon points="290,130 310,120 310,158 290,168" fill="var(--coffee)" stroke="var(--espresso)" strokeWidth="0.5" />
            <polygon points="290,130 315,117 335,127 310,140" fill="var(--coffee-soft)" />
            
            {/* Blinking LEDs on front door */}
            <circle cx="295" cy="138" r="1.5" fill="var(--olive)" className="animate-pulse" />
            <circle cx="295" cy="144" r="1.5" fill="var(--clay)" className="animate-[pulse_1.2s_infinite]" />
            <circle cx="295" cy="150" r="1.5" fill="var(--olive)" className="animate-pulse" />
            <circle cx="295" cy="156" r="1.5" fill="var(--olive)" className="animate-[pulse_0.8s_infinite]" />
            <circle cx="295" cy="162" r="1.5" fill="var(--clay)" className="animate-pulse" />
          </g>
        )}

        {/* Level 5: Bouncing Companion Robot */}
        {level >= 5 && (
          <g className="animate-[bounce_2s_infinite]">
            {/* Robot Head */}
            <circle cx="260" cy="180" r="8" fill="var(--clay)" />
            {/* Robot Eye */}
            <ellipse cx="258" cy="180" rx="2" ry="1" fill="var(--cream-raised)" />
            <ellipse cx="262" cy="180" rx="2" ry="1" fill="var(--cream-raised)" />
            {/* Robot Body */}
            <rect x="253" y="188" width="14" height="12" rx="3" fill="var(--espresso)" />
            <circle cx="260" cy="194" r="2.5" fill="var(--olive)" className="animate-pulse" />
            {/* Robot Tracks/Feet */}
            <ellipse cx="256" cy="201" rx="4" ry="1.5" fill="var(--coffee)" />
            <ellipse cx="264" cy="201" rx="4" ry="1.5" fill="var(--coffee)" />
          </g>
        )}
      </svg>
    </div>
  );
}

