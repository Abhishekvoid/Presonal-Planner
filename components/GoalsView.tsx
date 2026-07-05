"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { usePlanner } from "@/lib/store";
import { orderedDays, orderedTracks, tasksForTrack, trackProgress } from "@/lib/selectors";
import { Task, Track } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { Button, Field, inputClass, Modal, ProgressBar } from "./primitives";
import { TaskForm } from "./forms";
import { SectionDivider } from "./SectionDivider";

export function GoalsView() {
  const state = usePlanner();
  const tracks = useMemo(() => orderedTracks(state), [state]);
  const days = useMemo(() => orderedDays(state), [state]);
  const [openId, setOpenId] = useState<string | null>(tracks[0]?.id ?? null);
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task; trackId?: string }>({
    open: false,
  });
  const [trackModal, setTrackModal] = useState<{ open: boolean; track?: Track }>({ open: false });

  const overallStats = useMemo(() => {
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [state.tasks]);

  const focusTrack = useMemo(() => {
    if (tracks.length === 0) return null;
    let maxIncomplete = -1;
    let targetTrack: Track | null = null;
    tracks.forEach((track) => {
      const trackTasks = state.tasks.filter((t) => t.trackId === track.id);
      const incompleteCount = trackTasks.filter((t) => !t.done).length;
      if (incompleteCount > maxIncomplete) {
        maxIncomplete = incompleteCount;
        targetTrack = track;
      }
    });
    return targetTrack ? { track: targetTrack, count: maxIncomplete } : null;
  }, [tracks, state.tasks]);

  const backlogStats = useMemo(() => {
    const backlog = state.tasks.filter((t) => t.dayId === null);
    const hard = backlog.filter((t) => t.difficulty === "hard").length;
    const med = backlog.filter((t) => t.difficulty === "med").length;
    const easy = backlog.filter((t) => t.difficulty === "easy").length;
    return { count: backlog.length, hard, med, easy };
  }, [state.tasks]);

  return (
    <div>
      <div className="flex items-end justify-between pb-5">
        <div>
          <div className="label text-coffee mb-1">Tracks</div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tightest text-espresso">
            Your goals
          </h1>
        </div>
        <Button variant="solid" onClick={() => setTrackModal({ open: true })}>
          + New track
        </Button>
      </div>

      <SectionDivider />

      {/* Dashboard Grid */}
      <div className="mt-5 grid grid-cols-12 gap-3">
        {/* Card 1: Overall Completion */}
        <div className="col-span-12 md:col-span-4 border border-coffee/30 bg-cream-raised p-5 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="label text-coffee mb-1">Overall progress</div>
            <div className="font-display text-4xl font-extrabold tracking-tightest text-espresso leading-none">
              {overallStats.pct}%
            </div>
            <p className="text-xs text-coffee mt-1.5 leading-relaxed">
              {overallStats.done} of {overallStats.total} tasks completed across all study tracks.
            </p>
          </div>
          <div className="mt-4">
            <ProgressBar pct={overallStats.pct} />
          </div>
        </div>

        {/* Card 2: Focus Area */}
        <div className="col-span-12 md:col-span-4 border border-coffee/30 bg-cream-raised p-5 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="label text-coffee mb-1">Current Focus Area</div>
            <div className="font-display text-4xl font-extrabold tracking-tightest text-espresso leading-none truncate flex items-center gap-2">
              {focusTrack ? (
                <>
                  <span className="h-4 w-4 shrink-0" style={{ backgroundColor: focusTrack.track.accent }} />
                  {focusTrack.track.tag}
                </>
              ) : (
                "None"
              )}
            </div>
            <p className="text-xs text-coffee mt-1.5 leading-relaxed">
              {focusTrack && focusTrack.count > 0
                ? `${focusTrack.count} tasks remaining in this track. Keep pushing.`
                : "All tracks are fully completed or empty!"}
            </p>
          </div>
          {focusTrack && (
            <div className="mt-3 flex items-center justify-between text-xs border-t border-coffee/10 pt-2 text-coffee">
              <span>{focusTrack.track.name}</span>
              <span className="font-bold text-espresso">Focus needed</span>
            </div>
          )}
        </div>

        {/* Card 3: Backlog */}
        <div className="col-span-12 md:col-span-4 border border-coffee/30 bg-cream-raised p-5 flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="label text-coffee mb-1">Unscheduled Backlog</div>
            <div className="font-display text-4xl font-extrabold tracking-tightest text-espresso leading-none">
              {backlogStats.count} <span className="text-lg font-bold text-coffee font-sans">tasks</span>
            </div>
            <p className="text-xs text-coffee mt-1.5 leading-relaxed">
              Tasks in backlog waiting to be scheduled into a prep day.
            </p>
          </div>
          <div className="mt-3 flex gap-1.5 text-[9px] font-bold border-t border-coffee/10 pt-2 text-coffee">
            <span className="label !text-[9px] border border-clay/40 bg-clay/5 px-1 py-[1px] text-clay-deep">
              {backlogStats.hard} hard
            </span>
            <span className="label !text-[9px] border border-coffee/40 bg-coffee/5 px-1 py-[1px] text-coffee">
              {backlogStats.med} med
            </span>
            <span className="label !text-[9px] border border-olive/40 bg-olive/5 px-1 py-[1px] text-olive-deep">
              {backlogStats.easy} easy
            </span>
          </div>
        </div>
      </div>

      <RPGSkillTree />

      <div className="mt-6 space-y-3">
        {tracks.map((track) => {
          const p = trackProgress(state, track.id);
          const tasks = tasksForTrack(state, track.id);
          const open = openId === track.id;
          return (
            <div key={track.id} className="bg-cream-raised border hairline">
              <button
                onClick={() => setOpenId(open ? null : track.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <span className="h-3 w-3 shrink-0" style={{ backgroundColor: track.accent }} />
                <span className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-tightest text-espresso">
                  {track.name}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="hidden w-28 sm:block md:w-48">
                    <ProgressBar pct={p.pct} color={track.accent} />
                  </span>
                  <span className="w-12 text-right font-display text-sm font-bold text-coffee">
                    {p.done}/{p.total}
                  </span>
                </span>
                <span className="ml-1 text-sm text-coffee">{open ? "−" : "+"}</span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden border-t hairline"
                  >
                    <div className="px-5 py-2">
                      {tasks.length === 0 && (
                        <p className="py-4 text-sm text-coffee/70">No tasks in this track yet.</p>
                      )}
                      {tasks.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          editable
                          onEdit={(task) => setTaskModal({ open: true, task })}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 px-5 py-3 border-t hairline">
                      <Button
                        variant="outline"
                        onClick={() => setTaskModal({ open: true, trackId: track.id })}
                      >
                        + Add task
                      </Button>
                      <Button variant="ghost" onClick={() => setTrackModal({ open: true, track })}>
                        Edit track
                      </Button>
                      <Button
                        variant="danger"
                        className="ml-auto"
                        onClick={() => {
                          if (confirm(`Delete track "${track.name}" and all its tasks?`)) {
                            usePlanner.getState().deleteTrack(track.id);
                          }
                        }}
                      >
                        Delete track
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <Modal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false })}
        title={taskModal.task ? "Edit task" : "Add task"}
      >
        <TaskForm
          task={taskModal.task}
          defaultTrackId={taskModal.trackId}
          tracks={tracks}
          days={days}
          onDone={() => setTaskModal({ open: false })}
        />
      </Modal>

      <Modal
        open={trackModal.open}
        onClose={() => setTrackModal({ open: false })}
        title={trackModal.track ? "Edit track" : "New track"}
      >
        <TrackForm track={trackModal.track} onDone={() => setTrackModal({ open: false })} />
      </Modal>
    </div>
  );
}

// Theme-aware accents (resolve via CSS vars so tracks adapt to light/dark).
const PRESET_ACCENTS = [
  "var(--olive)",
  "var(--coffee)",
  "var(--espresso)",
  "var(--clay)",
  "var(--olive-deep)",
  "var(--olive-soft)",
];

function TrackForm({ track, onDone }: { track?: Track; onDone: () => void }) {
  const addTrack = usePlanner((s) => s.addTrack);
  const updateTrack = usePlanner((s) => s.updateTrack);
  const [name, setName] = useState(track?.name ?? "");
  const [tag, setTag] = useState(track?.tag ?? "");
  const [accent, setAccent] = useState(track?.accent ?? PRESET_ACCENTS[0]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagValue = (tag || name.slice(0, 8)).toUpperCase();
    if (track) updateTrack(track.id, { name, tag: tagValue, accent });
    else addTrack({ name, tag: tagValue, accent });
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          required
          placeholder="e.g. Frontend"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Short tag">
        <input
          className={inputClass}
          value={tag}
          placeholder="e.g. FE"
          onChange={(e) => setTag(e.target.value)}
        />
      </Field>
      <Field label="Accent">
        <div className="flex gap-2">
          {PRESET_ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAccent(c)}
              aria-label={`Accent ${c}`}
              className={`h-8 w-8 transition-transform ${
                accent === c ? "ring-2 ring-offset-2 ring-offset-cream-raised ring-espresso scale-105" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="solid">
          {track ? "Save track" : "Add track"}
        </Button>
      </div>
    </form>
  );
}

function RPGSkillTree() {
  const state = usePlanner();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const completions = useMemo(() => {
    const dsa = state.tasks.filter((t) => t.trackId === "track-dsa" && t.done).length;
    const backend = state.tasks.filter((t) => (t.trackId === "track-django" || t.trackId === "track-backend") && t.done).length;
    const sys = state.tasks.filter((t) => t.trackId === "track-sys" && t.done).length;
    const star = state.tasks.filter((t) => t.trackId === "track-interview" && t.done).length;
    return { dsa, backend, sys, star };
  }, [state.tasks]);

  const nodes = [
    {
      id: "dsa",
      name: "Leetcode Arrays & Searches",
      desc: "Optimal two-pointer sweeps, sliding windows, and division searches.",
      unlocked: completions.dsa >= 1,
      tip: "💡 INTERVIEW TIP: When searching sorted arrays, use binary search O(log N). For subarray sum problems of size K, use sliding window.",
      color: "var(--olive)"
    },
    {
      id: "backend",
      name: "Django & Database Tuning",
      desc: "Postgres index query planning, N+1 query loop prevention.",
      unlocked: completions.backend >= 1,
      tip: "💡 INTERVIEW TIP: Django `select_related` generates an INNER JOIN (use for ForeignKey). `prefetch_related` generates a separate IN query (use for ManyToMany).",
      color: "var(--clay)"
    },
    {
      id: "sys",
      name: "Distributed Scalability",
      desc: "Consistent hashing, token bucket rate limiting, and cache policies.",
      unlocked: completions.sys >= 1,
      tip: "💡 INTERVIEW TIP: Hashing standard keys causes unbalanced clusters when nodes change. Use Consistent Hashing (virtual nodes) to minimize cache churn to 1/N key remappings.",
      color: "var(--slate)"
    },
    {
      id: "star",
      name: "STAR Behavioral Pitching",
      desc: "Presenting real-time latency and engineering metrics concisely.",
      unlocked: completions.star >= 1,
      tip: "💡 INTERVIEW TIP: Structure behavioral stories as Situation (10%), Task (10%), Action (60% - focus on your coding choices), and Result (20% - quantitative numbers: e.g. 500ms to 150ms latency decrease!).",
      color: "var(--espresso)"
    }
  ];

  return (
    <div className="reveal mt-6 border border-coffee/30 bg-cream-raised p-5 rounded-sm shadow-sm" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center justify-between border-b border-coffee/15 pb-2.5 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-espresso uppercase tracking-wide">🌳 Developer Prep Skill Tree</h3>
          <p className="text-[10px] text-coffee mt-0.5">Unlocks automatically as you complete study tasks in each track</p>
        </div>
        <span className="text-[9px] font-mono font-bold text-coffee bg-cream-deep/40 px-2 py-0.5 rounded-sm">
          Unlocks: {nodes.filter(n => n.unlocked).length} / {nodes.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start pt-2">
        {nodes.map((node, idx) => (
          <div 
            key={node.id} 
            onClick={() => node.unlocked && setSelectedNode(selectedNode === node.id ? null : node.id)}
            className={`border rounded-sm p-3.5 transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px] ${
              node.unlocked 
                ? "cursor-pointer border-coffee/30 bg-cream-base/50 hover:-translate-y-0.5 hover:shadow-sm" 
                : "border-coffee/10 bg-cream-deep/20 opacity-55"
            }`}
          >
            {idx < nodes.length - 1 && (
              <div className="hidden sm:block absolute right-[-8px] top-1/2 -translate-y-1/2 text-coffee/30 text-sm font-bold z-10">
                →
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: node.unlocked ? node.color : "var(--coffee-soft)" }} />
                <span className="font-display text-xs font-bold text-espresso truncate">{node.name.split(" ")[0]}</span>
              </div>
              <p className="text-[10px] leading-snug text-coffee-soft line-clamp-2">{node.desc}</p>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                node.unlocked ? "text-olive-deep bg-olive/10" : "text-coffee bg-coffee/10"
              }`}>
                {node.unlocked ? "★ Unlocked" : "🔒 Locked"}
              </span>
              {node.unlocked && (
                <span className="text-[8px] text-coffee-soft font-bold uppercase underline">
                  {selectedNode === node.id ? "Hide Tip" : "View Tip"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedNode && (
        <div className="mt-4 p-3.5 bg-espresso text-cream-raised border border-coffee/30 rounded-sm font-mono text-[11px] leading-relaxed relative animate-fadeIn">
          <div className="flex justify-between items-center border-b border-cream-raised/15 pb-1.5 mb-2">
            <span className="text-[9px] uppercase font-bold text-clay tracking-wide">
              {nodes.find(n => n.id === selectedNode)?.name} — Study Guide Node
            </span>
            <button onClick={() => setSelectedNode(null)} className="text-cream-raised/60 hover:text-cream-raised font-bold text-xs select-none">
              × Close
            </button>
          </div>
          <p>{nodes.find(n => n.id === selectedNode)?.tip}</p>
        </div>
      )}
    </div>
  );
}
