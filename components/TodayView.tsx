"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { usePlanner } from "@/lib/store";
import { EASE_OUT_EXPO, springSoft } from "@/lib/motion";
import {
  dayProgress,
  orderedDays,
  orderedTracks,
  tasksForDayAndTrack,
} from "@/lib/selectors";
import { Day, Task } from "@/lib/types";
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

  const goToPrev = () => {
    const i = days.findIndex((d) => d.id === day.id);
    if (i > 0) setActiveId(days[i - 1].id);
  };
  const goToNext = () => {
    const i = days.findIndex((d) => d.id === day.id);
    if (i < days.length - 1) setActiveId(days[i + 1].id);
  };

  return (
    <div>
      <CarryoverCard />

      {/* Day rail */}
      <DayRail days={days} activeId={day.id} onPick={setActiveId} />

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

      {/* Goal / Must / Result */}
      <div className="mt-6 grid grid-cols-12 gap-3">
        <div
          className="reveal col-span-12 lg:col-span-7 bg-olive text-cream-raised p-5"
          style={delay(1)}
        >
          <div className="label text-cream-raised/70 mb-1.5">Main goal</div>
          <p className="text-[15px] leading-relaxed">{day.goal}</p>
        </div>
        <div
          className="reveal col-span-12 lg:col-span-5 border border-clay/40 bg-clay/[0.07] p-5"
          style={delay(2)}
        >
          <div className="label text-clay-deep mb-1.5">Must complete today</div>
          <p className="text-[13.5px] leading-relaxed text-espresso">{day.must}</p>
        </div>
      </div>

      <SectionDivider className="mt-6" />

      {/* Task sections — masonry so uneven counts pack tightly */}
      <div className="mt-6 columns-1 gap-3 md:columns-2">
        {tracks.map((track, i) => {
          const tasks = tasksForDayAndTrack(state, day.id, track.id);
          if (!tasks.length) return null;
          const done = tasks.filter((t) => t.done).length;
          return (
            <motion.section
              key={track.id}
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: (3 + i) * 0.06 }}
              whileHover={{ y: -3, transition: springSoft }}
              className="mb-3 break-inside-avoid bg-cream-raised border hairline"
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
            </motion.section>
          );
        })}
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
