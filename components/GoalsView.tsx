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

      <div className="mt-5 space-y-3">
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
