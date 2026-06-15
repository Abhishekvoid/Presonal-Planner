"use client";

import { useEffect, useState } from "react";
import { usePlanner } from "@/lib/store";
import { localDateKey } from "@/lib/focus";

const PROMPTS = [
  { key: "did", label: "What I did", placeholder: "The real work of today." },
  { key: "blockers", label: "Blockers", placeholder: "What got in the way." },
  { key: "oneThing", label: "One thing for tomorrow", placeholder: "The single most important thing." },
] as const;

export function ReflectionCard() {
  const today = localDateKey(new Date());
  const reflection = usePlanner((s) => s.reflections.find((r) => r.date === today));
  const upsertReflection = usePlanner((s) => s.upsertReflection);

  const [f, setF] = useState({
    did: reflection?.did ?? "",
    blockers: reflection?.blockers ?? "",
    oneThing: reflection?.oneThing ?? "",
  });

  // Sync if another tab / the store updates the reflection underneath us.
  useEffect(() => {
    setF({
      did: reflection?.did ?? "",
      blockers: reflection?.blockers ?? "",
      oneThing: reflection?.oneThing ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reflection?.updatedAt]);

  const persist = (key: keyof typeof f) => {
    if ((reflection?.[key] ?? "") !== f[key]) {
      upsertReflection(today, { [key]: f[key] });
    }
  };

  return (
    <div className="border hairline bg-cream-raised p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="label text-espresso">Today&rsquo;s shutdown</span>
        <span className="label text-coffee">
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="space-y-3">
        {PROMPTS.map((p) => (
          <label key={p.key} className="block">
            <span className="label text-coffee mb-1 block">{p.label}</span>
            <textarea
              value={f[p.key]}
              placeholder={p.placeholder}
              onChange={(e) => setF((prev) => ({ ...prev, [p.key]: e.target.value }))}
              onBlur={() => persist(p.key)}
              className="min-h-[44px] w-full resize-y bg-cream-base border hairline px-3 py-2 text-sm leading-relaxed text-espresso placeholder:text-coffee/70 focus:border-olive focus:outline-none"
            />
          </label>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-coffee/70">Saved automatically.</p>
    </div>
  );
}
