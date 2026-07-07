"use client";

import { FocusTimer } from "./focus/FocusTimer";
import { Heatmap } from "./focus/Heatmap";
import { ReflectionCard } from "./focus/ReflectionCard";
import { StudyHistory } from "./focus/StudyHistory";
import { SectionDivider } from "./SectionDivider";

const delay = (i: number) => ({ animationDelay: `${i * 0.06}s` });

export function FocusView() {
  return (
    <div className="space-y-6">
      <header className="reveal" style={delay(0)}>
        <h1 className="font-display text-2xl sm:text-[2rem] font-bold leading-[1.05] tracking-tightest text-espresso">
          Focus
        </h1>
        <p className="mt-1 text-sm text-coffee">
          Run a block, keep the streak, close the day.
        </p>
      </header>

      <div className="reveal" style={delay(1)}>
        <FocusTimer />
      </div>

      <SectionDivider />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="reveal" style={delay(2)}>
          <Heatmap />
        </div>
        <div className="reveal" style={delay(3)}>
          <ReflectionCard />
        </div>
      </div>

      <SectionDivider />

      <div className="reveal" style={delay(4)}>
        <StudyHistory />
      </div>
    </div>
  );
}
