"use client";

import { FormEvent, useState } from "react";
import { Day, Difficulty, Task, Track } from "@/lib/types";
import { usePlanner } from "@/lib/store";
import { Button, Field, inputClass } from "./primitives";

/* ---------- Day form ---------- */

export function DayForm({
  day,
  onDone,
}: {
  day?: Day;
  onDone: () => void;
}) {
  const addDay = usePlanner((s) => s.addDay);
  const updateDay = usePlanner((s) => s.updateDay);
  const days = usePlanner((s) => s.days);

  const [f, setF] = useState({
    title: day?.title ?? "",
    date: day?.date ?? "",
    goal: day?.goal ?? "",
    must: day?.must ?? "",
    result: day?.result ?? "",
    index: day?.index ?? days.length + 1,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (day) {
      updateDay(day.id, f);
    } else {
      addDay(f);
    }
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <Field label="Day #">
            <input
              type="number"
              className={inputClass}
              value={f.index}
              onChange={(e) => setF({ ...f, index: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Date">
            <input
              className={inputClass}
              value={f.date}
              placeholder="Jun 15"
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
        </div>
      </div>
      <Field label="Title">
        <input
          className={inputClass}
          value={f.title}
          required
          placeholder="What is this day about?"
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
      </Field>
      <Field label="Main goal">
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={f.goal}
          onChange={(e) => setF({ ...f, goal: e.target.value })}
        />
      </Field>
      <Field label="Must complete today">
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={f.must}
          onChange={(e) => setF({ ...f, must: e.target.value })}
        />
      </Field>
      <Field label="Day ends when you can…">
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={f.result}
          onChange={(e) => setF({ ...f, result: e.target.value })}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="solid">
          {day ? "Save day" : "Add day"}
        </Button>
      </div>
    </form>
  );
}

/* ---------- Task form ---------- */

const DIFFS: (Difficulty | "")[] = ["", "easy", "med", "hard"];

export function TaskForm({
  task,
  defaultDayId,
  defaultTrackId,
  tracks,
  days,
  onDone,
}: {
  task?: Task;
  defaultDayId?: string | null;
  defaultTrackId?: string;
  tracks: Track[];
  days: Day[];
  onDone: () => void;
}) {
  const addTask = usePlanner((s) => s.addTask);
  const updateTask = usePlanner((s) => s.updateTask);

  const [f, setF] = useState({
    text: task?.text ?? "",
    trackId: task?.trackId ?? defaultTrackId ?? tracks[0]?.id ?? "",
    dayId: task?.dayId ?? defaultDayId ?? null,
    difficulty: (task?.difficulty ?? "") as Difficulty | "",
    tip: task?.tip ?? "",
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      text: f.text,
      trackId: f.trackId,
      dayId: f.dayId,
      difficulty: f.difficulty || undefined,
      tip: f.tip || undefined,
    };
    if (task) {
      updateTask(task.id, payload);
    } else {
      addTask(payload);
    }
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Task">
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={f.text}
          required
          placeholder="What needs to be done?"
          onChange={(e) => setF({ ...f, text: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Track">
          <select
            className={inputClass}
            value={f.trackId}
            onChange={(e) => setF({ ...f, trackId: e.target.value })}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Day">
          <select
            className={inputClass}
            value={f.dayId ?? ""}
            onChange={(e) => setF({ ...f, dayId: e.target.value || null })}
          >
            <option value="">Backlog (no day)</option>
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                Day {d.index} · {d.date}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Difficulty">
          <select
            className={inputClass}
            value={f.difficulty}
            onChange={(e) => setF({ ...f, difficulty: e.target.value as Difficulty | "" })}
          >
            {DIFFS.map((d) => (
              <option key={d} value={d}>
                {d || "none"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tip (optional)">
          <input
            className={inputClass}
            value={f.tip}
            onChange={(e) => setF({ ...f, tip: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="solid">
          {task ? "Save task" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
