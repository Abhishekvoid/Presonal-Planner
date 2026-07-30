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
import { lockTopicAndOpenMentor } from "@/lib/topicLocker";
import { Brain } from "@phosphor-icons/react";

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
    for (const track of tracks) {
      const trackTasks = state.tasks.filter((t) => t.trackId === track.id);
      const incompleteCount = trackTasks.filter((t) => !t.done).length;
      if (incompleteCount > maxIncomplete) {
        maxIncomplete = incompleteCount;
        targetTrack = track;
      }
    }
    return targetTrack ? { track: targetTrack as Track, count: maxIncomplete } : null;
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
      <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
        <div>
          <div className="label text-coffee mb-1">Tracks</div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tightest text-espresso">
            Your goals
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const openTrack = tracks.find((t) => t.id === openId) || tracks[0];
              window.dispatchEvent(
                new CustomEvent("open-ai-mentor", {
                  detail: {
                    topicId: openTrack?.id || "general-backend",
                    title: openTrack?.name || "Backend Engineering Goals",
                    day: 1,
                  },
                })
              );
            }}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-all shadow-sm"
          >
            🔥 Grill Me with AI Mentor
          </button>
          <Button variant="solid" onClick={() => setTrackModal({ open: true })}>
            + New track
          </Button>
        </div>
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
  const [fixModal, setFixModal] = useState<{ open: boolean; title: string; prompt: string }>({
    open: false,
    title: "",
    prompt: "",
  });

  const completions = useMemo(() => {
    const dsa = state.tasks.filter((t) => t.trackId === "track-dsa" && t.done).length;
    const backend = state.tasks.filter((t) => (t.trackId === "track-django" || t.trackId === "track-backend") && t.done).length;
    const sys = state.tasks.filter((t) => t.trackId === "track-sys" && t.done).length;
    const star = state.tasks.filter((t) => t.trackId === "track-interview" && t.done).length;
    return { dsa, backend, sys, star };
  }, [state.tasks]);

  const nodes = [
    {
      id: "llm",
      name: "LLM Architectures & Transformers",
      desc: "Self-attention mechanisms, KV Caching, and FlashAttention 2.",
      status: completions.dsa >= 1 ? "PROVEN" : "BUILDING",
      tip: "💡 AI ENGINEER LESSON: KV Caching avoids recalculating Key and Value tensors for previously generated tokens, reducing decoding time complexity per token from O(N²) to O(N).",
      color: "var(--olive)",
      prompt: "Implement KV-cache tensor slicing in PyTorch."
    },
    {
      id: "rag",
      name: "RAG & Hybrid Vector Search",
      desc: "Dense vector retrieval + Cross-Encoder precision reranking.",
      status: completions.backend >= 1 ? "PROVEN" : "BUILDING",
      tip: "💡 AI ENGINEER LESSON: Bi-encoders are fast for first-stage retrieval (Top 100), but Cross-encoders process Query + Document jointly, providing far higher accuracy for final re-ranking (Top 5).",
      color: "var(--clay)",
      prompt: "Build Cross-Encoder re-ranker pipeline with Qdrant."
    },
    {
      id: "agents",
      name: "Autonomous AI Agents & Tooling",
      desc: "ReAct loop, function calling, stateful memory & subagents.",
      status: completions.sys >= 1 ? "BUILDING" : "LOCKED",
      tip: "💡 AI ENGINEER LESSON: Prevent infinite agent execution loops by enforcing explicit max_iterations, structured JSON outputs, and fallback error handlers.",
      color: "var(--slate)",
      prompt: "Create ReAct loop with max iteration backoff."
    },
    {
      id: "cuda",
      name: "CUDA Kernels & Hardware Optimization",
      desc: "Smem tiling, coalesced memory access, and PyTorch C++ extensions.",
      status: completions.star >= 1 ? "BUILDING" : "LOCKED",
      tip: "💡 AI ENGINEER LESSON: Memory bandwidth is usually the bottleneck for LLM inference (memory-bound), while matrix multiplication pre-fill is compute-bound.",
      color: "var(--espresso)",
      prompt: "Optimize matrix multiplication CUDA kernel tile size."
    }
  ];

  return (
    <div className="reveal mt-6 border border-hair bg-cream-raised dark:bg-[#12151E] p-5 rounded-lg text-espresso shadow-sm">
      <div className="flex items-center justify-between border-b border-hair pb-3 mb-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
            ⚡ AI ENGINEER PATHWAY MAP
          </h3>
          <p className="font-mono text-[11px] text-coffee mt-0.5">
            Path node state: LOCKED → BUILDING → PROVEN
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-coffee bg-cream-deep dark:bg-white/5 border border-hair px-2 py-0.5 rounded">
          Proven Nodes: {nodes.filter(n => n.status === "PROVEN").length} / {nodes.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start pt-1">
        {nodes.map((node, idx) => (
          <div 
            key={node.id} 
            onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
            className={`border rounded p-3.5 transition-all relative overflow-hidden flex flex-col justify-between min-h-[120px] ${
              node.status === "PROVEN"
                ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20 hover:border-emerald-400 cursor-pointer shadow-sm" 
                : node.status === "BUILDING"
                ? "border-hair bg-cream-deep dark:bg-white/[0.04] hover:border-amber-400 cursor-pointer"
                : "border-hair bg-cream-deep/50 dark:bg-zinc-950/40 opacity-50"
            }`}
          >
            {idx < nodes.length - 1 && (
              <div className="hidden sm:block absolute right-[-8px] top-1/2 -translate-y-1/2 text-coffee font-mono text-xs font-bold z-10">
                →
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${node.status === "PROVEN" ? "bg-emerald-500 animate-pulse" : node.status === "BUILDING" ? "bg-amber-500" : "bg-zinc-500"}`} />
                <span className="font-mono text-xs font-bold text-espresso truncate">{node.name.split(" ")[0]}</span>
              </div>
              <p className="font-mono text-[10px] leading-snug text-coffee line-clamp-2">{node.desc}</p>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-hair">
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                node.status === "PROVEN" 
                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-500/30" 
                  : node.status === "BUILDING"
                  ? "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border border-amber-500/30"
                  : "text-coffee bg-cream-deep dark:bg-zinc-900 border border-hair"
              }`}>
                {node.status === "PROVEN" ? "PROVEN" : node.status === "BUILDING" ? "BUILDING" : "LOCKED"}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    lockTopicAndOpenMentor({
                      id: node.id,
                      title: node.name,
                      description: node.desc,
                    });
                  }}
                  className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-600 dark:text-amber-400 font-bold hover:underline"
                  title="Lock topic and open AI Senior Mentor"
                >
                  <Brain size={11} weight="fill" />
                  <span>Lock & Drill</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const topicIdMap: Record<string, string> = {
                      llm: "day-1-django-orm",
                      rag: "day-6-rag-architecture",
                      agents: "day-4-celery-async-reliability",
                      cuda: "day-2-postgres-indexing",
                    };
                    window.dispatchEvent(
                      new CustomEvent("open-fde-topic", {
                        detail: topicIdMap[node.id] ?? "day-1-django-orm",
                      })
                    );
                  }}
                  className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold underline"
                >
                  [0-1 Notes]
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedNode && (
        <div className="mt-4 p-3.5 bg-cream-deep dark:bg-[#181C27] text-espresso border border-hair rounded font-mono text-[11px] leading-relaxed relative animate-fadeIn">
          <div className="flex justify-between items-center border-b border-hair pb-1.5 mb-2">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
              {nodes.find(n => n.id === selectedNode)?.name} — AI Engineer Node
            </span>
            <button onClick={() => setSelectedNode(null)} className="text-coffee hover:text-espresso font-bold text-xs select-none">
              × Close
            </button>
          </div>
          <p>{nodes.find(n => n.id === selectedNode)?.tip}</p>
        </div>
      )}

      {/* Fix-Lesson Repair Drawer Modal */}
      <Modal
        open={fixModal.open}
        onClose={() => setFixModal({ open: false, title: "", prompt: "" })}
        title={`Fix & Repair Lesson // ${fixModal.title}`}
      >
        <div className="space-y-4 font-mono text-xs text-slate-200 pt-2">
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            <span className="text-amber-400 font-bold">Pillar 5:</span> Repair lesson parameters when a concept feels misaligned or needs customized challenge sizing.
          </p>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
              Lesson Target Prompt & Challenge
            </label>
            <textarea
              value={fixModal.prompt}
              onChange={(e) => setFixModal({ ...fixModal, prompt: e.target.value })}
              rows={3}
              className="w-full bg-[#050505] border border-white/15 rounded p-2.5 outline-none focus:border-white/40 text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => setFixModal({ open: false, title: "", prompt: "" })}
              className="px-3 py-1.5 rounded border border-white/15 text-zinc-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setFixModal({ open: false, title: "", prompt: "" });
              }}
              className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
            >
              [Save Repair]
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
