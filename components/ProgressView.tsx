"use client";

import { useMemo, useState, useEffect } from "react";
import { usePlanner } from "@/lib/store";
import {
  dayProgress,
  orderedDays,
  orderedTracks,
  overallProgress,
  trackProgress,
} from "@/lib/selectors";
import { useCountUp } from "@/lib/useCountUp";
import { KineticNumber, PressIn } from "@/lib/kineticType";
import { SectionDivider } from "./SectionDivider";
import { Button } from "./primitives";
import { buildHeatmap, computeStreak } from "@/lib/focus";

export function ProgressView() {
  const state = usePlanner();
  const tracks = useMemo(() => orderedTracks(state), [state]);
  const days = useMemo(() => orderedDays(state), [state]);
  const overall = overallProgress(state);
  const doneCount = useCountUp(overall.done);

  const totalFocus = useMemo(() => {
    return state.sessions.reduce((acc, s) => acc + s.minutes, 0);
  }, [state.sessions]);

  const streak = useMemo(() => {
    const today = new Date();
    const weeks = 13;
    const heatmapDays = buildHeatmap(state.sessions, state.tasks, weeks, today);
    return computeStreak(heatmapDays, today);
  }, [state.sessions, state.tasks]);

  // Leetcode & DSA stats
  const dsaStats = useMemo(() => {
    const dsaTasks = state.tasks.filter((t) => t.trackId === "track-dsa");
    const easyTotal = dsaTasks.filter((t) => t.difficulty === "easy").length;
    const easyDone = dsaTasks.filter((t) => t.difficulty === "easy" && t.done).length;
    const medTotal = dsaTasks.filter((t) => t.difficulty === "med").length;
    const medDone = dsaTasks.filter((t) => t.difficulty === "med" && t.done).length;
    const hardTotal = dsaTasks.filter((t) => t.difficulty === "hard").length;
    const hardDone = dsaTasks.filter((t) => t.difficulty === "hard" && t.done).length;
    return { easyTotal, easyDone, medTotal, medDone, hardTotal, hardDone };
  }, [state.tasks]);

  // Group solved DSA patterns
  const solvedPatterns = useMemo(() => {
    const patternsMap = new Map<string, number>();
    state.tasks
      .filter((t) => t.trackId === "track-dsa" && t.done)
      .forEach((t) => {
        let pattern = "General";
        if (t.tip) {
          const colonIndex = t.tip.indexOf(":");
          if (colonIndex !== -1) {
            pattern = t.tip.substring(0, colonIndex).trim();
          }
        }
        patternsMap.set(pattern, (patternsMap.get(pattern) ?? 0) + 1);
      });
    return Array.from(patternsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [state.tasks]);

  // Subject readiness based on track completions
  const trackReadiness = useMemo(() => {
    return tracks.map((track) => {
      const trackTasks = state.tasks.filter((t) => t.trackId === track.id);
      const total = trackTasks.length;
      const done = trackTasks.filter((t) => t.done).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...track, done, total, pct };
    });
  }, [tracks, state.tasks]);

  return (
    <div>
      {/* Big overall number */}
      <div className="grid grid-cols-12 items-end gap-4 pb-7">
        <div className="col-span-12 sm:col-span-5">
          <PressIn className="label text-coffee mb-1 block">Overall completion</PressIn>
          <div className="flex items-baseline gap-2">
            <KineticNumber
              value={overall.pct}
              className="font-display text-[6rem] leading-[0.8] font-extrabold tracking-tightest tabular-nums text-espresso"
            />
            <span className="font-display text-3xl font-bold text-olive">%</span>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-7 sm:pb-2">
          <p className="font-display text-xl font-semibold tracking-tightest tabular-nums text-coffee">
            {doneCount} of {overall.total} tasks done
          </p>
          <p className="mt-1 text-sm text-coffee/80">
            Across {days.length} days and {tracks.length} tracks.
          </p>
        </div>
      </div>

      <SectionDivider />

      {/* Dashboard Bento Row */}
      <div className="mt-6 grid grid-cols-12 gap-4">
        {/* Leetcode / DSA Scorecard */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 border border-coffee/30 bg-cream-raised p-5 flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="label text-coffee mb-1">Leetcode &amp; DSA stats</div>
            <div className="mt-2.5 flex items-baseline gap-3">
              <span className="text-xs font-bold text-olive-deep bg-olive/5 border border-olive/30 px-2 py-0.5 rounded-sm">
                E: {dsaStats.easyDone}/{dsaStats.easyTotal}
              </span>
              <span className="text-xs font-bold text-coffee bg-coffee/5 border border-coffee/30 px-2 py-0.5 rounded-sm">
                M: {dsaStats.medDone}/{dsaStats.medTotal}
              </span>
              <span className="text-xs font-bold text-clay-deep bg-clay/5 border border-clay/30 px-2 py-0.5 rounded-sm">
                H: {dsaStats.hardDone}/{dsaStats.hardTotal}
              </span>
            </div>
            <p className="text-xs text-coffee mt-3 leading-relaxed">
              DSA coding questions resolved by difficulty.
            </p>
          </div>
          {solvedPatterns.length > 0 && (
            <div className="mt-3 max-h-[70px] overflow-y-auto no-scrollbar border-t border-coffee/10 pt-2 text-[10px] text-coffee/90 space-y-0.5">
              <span className="font-bold text-[9px] text-espresso uppercase block mb-1">Solved Patterns</span>
              {solvedPatterns.map((sp) => (
                <div key={sp.name} className="flex justify-between">
                  <span>• {sp.name}</span>
                  <span className="font-semibold text-espresso">{sp.count} solved</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Focus & Streak stats */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 border border-coffee/30 bg-cream-raised p-5 flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="label text-coffee mb-1">Study Focus Stats</div>
            <div className="font-display text-4xl font-extrabold tracking-tightest text-espresso leading-none mt-2">
              {totalFocus >= 60
                ? `${Math.floor(totalFocus / 60)}h ${totalFocus % 60}m`
                : `${totalFocus}m`}
            </div>
            <p className="text-xs text-coffee mt-2 leading-relaxed">
              Total accumulated focus time logged across all Pomodoro sessions.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs border-t border-coffee/10 pt-2 text-coffee">
            <span>Current Streak</span>
            <span className="font-display font-bold text-espresso">
              {streak > 0 ? `${streak} day${streak > 1 ? "s" : ""}` : "No active streak"}
            </span>
          </div>
        </div>

        {/* Subject Readiness */}
        <div className="col-span-12 lg:col-span-4 border border-coffee/30 bg-cream-raised p-5 flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="label text-coffee mb-1">Subject Readiness</div>
            <p className="text-xs text-coffee mt-1 leading-relaxed">
              Subject mastery calculated from track tasks completion rate.
            </p>
          </div>
          <div className="mt-3 flex-grow overflow-y-auto no-scrollbar max-h-[110px] space-y-2 border-t border-coffee/10 pt-2.5">
            {trackReadiness.map((tr) => (
              <div key={tr.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-espresso">
                    <span className="h-2 w-2 shrink-0" style={{ backgroundColor: tr.accent }} />
                    {tr.name}
                  </span>
                  <span className="font-bold text-espresso">{tr.pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-cream-deep">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${tr.pct}%`, backgroundColor: tr.accent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CalendarNotificationCard />

      <StartupPredictorCard />

      <STARWorkbookCard />

      <LeetcodeQuizCard />

      <SectionDivider className="mt-8" />

      {/* Per-track */}
      <section className="mt-8">
        <div className="label text-coffee mb-3">By track</div>
        <div className="space-y-4">
          {tracks.map((t, i) => {
            const p = trackProgress(state, t.id);
            return (
              <div
                key={t.id}
                className="reveal flex items-center gap-4"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="h-3 w-3 shrink-0" style={{ backgroundColor: t.accent }} />
                <span className="w-24 shrink-0 truncate text-sm font-medium text-espresso sm:w-40">
                  {t.name}
                </span>
                <div className="relative h-6 flex-1 bg-cream-deep">
                  <div
                    className="grow-x h-full"
                    style={{
                      width: `${p.pct}%`,
                      backgroundColor: t.accent,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                </div>
                <span className="font-display w-14 shrink-0 text-right text-sm font-bold text-coffee">
                  {p.done}/{p.total}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <SectionDivider className="mt-10" />

      {/* Per-day */}
      <section className="mt-10">
        <div className="label text-coffee mb-3">By day</div>
        <div className="border-t hairline">
          {days.map((d) => {
            const p = dayProgress(state, d.id);
            const complete = p.total > 0 && p.done === p.total;
            return (
              <div
                key={d.id}
                className="grid grid-cols-12 items-center gap-3 border-b hairline py-3"
              >
                <span className="col-span-2 sm:col-span-1 font-display text-base font-bold tracking-tightest text-espresso">
                  {String(d.index).padStart(2, "0")}
                </span>
                <span className="col-span-10 sm:col-span-4 truncate text-sm text-espresso">
                  {d.title}
                </span>
                <span className="col-span-9 sm:col-span-5">
                  <div className="h-2 w-full bg-cream-deep">
                    <div
                      className="h-full"
                      style={{
                        width: `${p.pct}%`,
                        backgroundColor: complete ? "var(--olive)" : "var(--coffee)",
                      }}
                    />
                  </div>
                </span>
                <span className="col-span-3 sm:col-span-2 text-right font-display text-xs font-bold text-coffee">
                  {p.done}/{p.total}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ---------- Calendar Sync & Notifications Card ---------- */

function parseVisualDate(dateStr: string): Date {
  const currentYear = new Date().getFullYear();
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 2) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = monthNames.findIndex((m) => m.toLowerCase() === parts[0].toLowerCase().slice(0, 3));
    const day = parseInt(parts[1], 10);
    if (monthIdx !== -1 && !isNaN(day)) {
      return new Date(currentYear, monthIdx, day);
    }
  }
  return new Date();
}

function formatICalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}T090000`;
}

function formatICalEndDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}T170000`;
}

import { Day, Task, Track } from "@/lib/types";

function generateICalFeed(days: Day[], tasks: Task[], tracks: Track[], startDateStr: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudyAssistant//Prep Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const parsedAnchor = new Date(startDateStr);
  const startAnchor = isNaN(parsedAnchor.getTime()) ? new Date() : parsedAnchor;

  for (const day of days) {
    const eventDate = new Date(startAnchor);
    eventDate.setDate(startAnchor.getDate() + (day.index - 1));

    const dateStart = formatICalDate(eventDate);
    const dateEnd = formatICalEndDate(eventDate);
    const dayTasks = tasks.filter((t) => t.dayId === day.id);

    const descriptionParts = [
      `Main Goal: ${day.goal}`,
      `Must Complete: ${day.must}`,
      `Day Ends Result: ${day.result}`,
    ];

    if (dayTasks.length > 0) {
      descriptionParts.push("Tasks:\n" + dayTasks.map((t) => {
        const track = tracks.find((tr) => tr.id === t.trackId);
        return `- [${track?.name ?? "General"}] ${t.text} (${t.difficulty ?? "medium"})${t.done ? " [DONE]" : ""}`;
      }).join("\n"));
    }

    const description = descriptionParts.join("\n\n")
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

    const summary = `Day ${day.index}: ${day.title}`
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,");

    lines.push(
      "BEGIN:VEVENT",
      `UID:day-${day.id}@studyassistant.com`,
      `DTSTAMP:${formatICalDate(new Date())}Z`,
      `DTSTART;TZID=Local:${dateStart}`,
      `DTEND;TZID=Local:${dateEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function CalendarNotificationCard() {
  const state = usePlanner();
  const tracks = useMemo(() => orderedTracks(state), [state]);
  const days = useMemo(() => orderedDays(state), [state]);
  const [notifState, setNotifState] = useState<NotificationPermission | "unsupported">("default");

  const [startDate, setStartDate] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ical-cycle-start");
      if (saved) return saved;
    }
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!("Notification" in window)) {
        setNotifState("unsupported");
      } else {
        setNotifState(Notification.permission as NotificationPermission);
      }
    }
  }, []);

  const handleDateChange = (val: string) => {
    setStartDate(val);
    localStorage.setItem("ical-cycle-start", val);
  };

  const enableNotifications = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifState(permission as NotificationPermission);
      if (permission === "granted") {
        new Notification("Notifications Enabled!", {
          body: "You'll receive desktop alerts for focus timer milestones.",
          silent: true,
        });
      }
    }
  };

  const handleExport = () => {
    const icsContent = generateICalFeed(days, state.tasks, tracks, startDate);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "study-prep-schedule.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="border border-coffee/30 bg-cream-raised p-5 mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="label text-coffee mb-1">Calendar &amp; Alerts</div>
        <h3 className="font-display text-lg font-bold text-espresso">
          Sync with your calendar &amp; enable push notifications
        </h3>
        <p className="text-xs text-coffee mt-1 max-w-xl">
          Download the 10-day prep schedule as a `.ics` file. Choose your cycle start date to sequentially lay out the schedule on your personal calendar.
        </p>

        {/* Date Selector input */}
        <div className="pt-2.5 flex items-center gap-3">
          <label className="label text-[10px] text-coffee uppercase font-bold tracking-wider">Cycle Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="bg-cream-base border border-coffee/20 px-2 py-1 text-xs text-espresso rounded-sm font-mono focus:outline-none focus:border-olive"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5 shrink-0 items-center">
        <Button variant="outline" onClick={handleExport}>
          📅 Export Calendar (.ics)
        </Button>
        {notifState === "granted" ? (
          <span className="text-xs font-semibold text-olive-deep border border-olive/30 bg-olive/5 px-3 py-2 rounded-md">
            ✓ Alerts Enabled
          </span>
        ) : notifState === "denied" ? (
          <span className="text-xs font-semibold text-clay-deep border border-clay/30 bg-clay/5 px-3 py-2 rounded-md">
            ⚠ Alerts Blocked
          </span>
        ) : notifState === "unsupported" ? (
          <span className="text-xs font-semibold text-coffee border border-coffee/10 bg-cream-base px-3 py-2 rounded-md">
            Alerts Unsupported
          </span>
        ) : (
          <Button variant="solid" onClick={enableNotifications}>
            🔔 Enable Alerts
          </Button>
        )}
      </div>
    </div>
  );
}

function StartupPredictorCard() {
  const state = usePlanner();
  const overall = overallProgress(state);
  const predictor = useMemo(() => {
    const c = overall.pct;
    
    // Readiness starts from a strong resume baseline (Robotics + AI/ML background)
    const seedReadiness = Math.min(100, 60 + Math.round(c * 0.4));
    const seriesAReadiness = Math.min(100, 50 + Math.round(c * 0.45));
    const ycReadiness = Math.min(100, 35 + Math.round(c * 0.5));

    // Dynamic compensation ranges (calibrated for 1.5+ years specialized Robotics/AI/Backend profile)
    const seedMin = 10 + Math.round(c * 0.05); // starts at ₹10L, goes up to ₹15L
    const seedMax = 14 + Math.round(c * 0.08); // starts at ₹14L, goes up to ₹22L
    const seedRange = `₹${seedMin}L - ₹${seedMax}L`;

    const seriesAMin = 14 + Math.round(c * 0.08); // starts at ₹14L, goes up to ₹22L
    const seriesAMax = 20 + Math.round(c * 0.12); // starts at ₹20L, goes up to ₹32L
    const seriesARange = `₹${seriesAMin}L - ₹${seriesAMax}L`;

    const ycMinUSD = 50 + Math.round(c * 0.3); // starts at $50k, goes up to $80k
    const ycMaxUSD = 75 + Math.round(c * 0.5); // starts at $75k, goes up to $125k
    const ycMinINR = Math.round(ycMinUSD * 0.83); // in Lakhs
    const ycMaxINR = Math.round(ycMaxUSD * 0.83); // in Lakhs
    const ycRange = `$${ycMinUSD}k - $${ycMaxUSD}k (~₹${ycMinINR}L - ₹${ycMaxINR}L)`;

    const getVerdict = (val: number) => {
      if (val < 50) return { text: "Need More Prep", color: "text-clay-deep" };
      if (val < 75) return { text: "Moderate Match", color: "text-coffee" };
      if (val < 90) return { text: "Strong Match", color: "text-olive-deep font-semibold" };
      return { text: "Exceptional Match", color: "text-olive-deep font-bold animate-pulse" };
    };

    return {
      seedReadiness,
      seriesAReadiness,
      ycReadiness,
      seedRange,
      seriesARange,
      ycRange,
      seedVerdict: getVerdict(seedReadiness),
      seriesAVerdict: getVerdict(seriesAReadiness),
      ycVerdict: getVerdict(ycReadiness),
    };
  }, [overall.pct]);

  return (
    <div className="border border-coffee/30 bg-cream-raised p-5 mt-6">
      <div className="label text-coffee mb-2">Career Valuation Predictor</div>
      <h3 className="font-display text-lg font-bold text-espresso mb-4">
        Startup Interview Readiness &amp; Compensation Estimator
      </h3>
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Expected Package */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <div className="border border-coffee/15 bg-cream-base/50 p-4 rounded-sm">
            <h4 className="label text-espresso mb-3">Expected Valuation Package</h4>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-coffee font-medium">🌱 Seed Startup Package</span>
                <span className="font-display font-bold text-espresso text-sm">{predictor.seedRange}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-coffee font-medium">🚀 Series A Startup Package</span>
                <span className="font-display font-bold text-espresso text-sm">{predictor.seriesARange}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-coffee font-medium">🦄 YC Startup Package (Global Remote)</span>
                <span className="font-display font-bold text-espresso text-sm text-right">{predictor.ycRange}</span>
              </div>
            </div>
            <p className="text-[10px] text-coffee/80 mt-4 leading-relaxed border-t border-coffee/10 pt-2.5">
              * Comp estimations scale dynamically as overall completion increases. YC calculations use standard USD remote equivalents.
            </p>
          </div>
        </div>

        {/* Startup Interview Readiness */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <div className="border border-coffee/15 bg-cream-base/50 p-4 rounded-sm space-y-4">
            <h4 className="label text-espresso">Startup Fitment Coverage</h4>
            
            {/* Seed Stage */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-espresso">🌱 Seed Startups</span>
                <span className={predictor.seedVerdict.color}>{predictor.seedVerdict.text} ({predictor.seedReadiness}%)</span>
              </div>
              <div className="h-2 w-full bg-cream-deep">
                <div
                  className="h-full bg-coffee transition-all duration-500"
                  style={{ width: `${predictor.seedReadiness}%` }}
                />
              </div>
            </div>

            {/* Series A */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-espresso">🚀 Indian Series A Startups</span>
                <span className={predictor.seriesAVerdict.color}>{predictor.seriesAVerdict.text} ({predictor.seriesAReadiness}%)</span>
              </div>
              <div className="h-2 w-full bg-cream-deep">
                <div
                  className="h-full bg-clay transition-all duration-500"
                  style={{ width: `${predictor.seriesAReadiness}%` }}
                />
              </div>
            </div>

            {/* YC Startups */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-espresso">🦄 YC Startups (Global/Remote)</span>
                <span className={predictor.ycVerdict.color}>{predictor.ycVerdict.text} ({predictor.ycReadiness}%)</span>
              </div>
              <div className="h-2 w-full bg-cream-deep">
                <div
                  className="h-full bg-olive-deep transition-all duration-500"
                  style={{ width: `${predictor.ycReadiness}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function STARWorkbookCard() {
  const [storyId, setStoryId] = useState("nexus_latency");
  const [s, setS] = useState("");
  const [t, setT] = useState("");
  const [a, setA] = useState("");
  const [r, setR] = useState("");

  useEffect(() => {
    setS(localStorage.getItem(`star-${storyId}-s`) ?? "");
    setT(localStorage.getItem(`star-${storyId}-t`) ?? "");
    setA(localStorage.getItem(`star-${storyId}-a`) ?? "");
    setR(localStorage.getItem(`star-${storyId}-r`) ?? "");
  }, [storyId]);

  const save = (key: "s" | "t" | "a" | "r", val: string) => {
    localStorage.setItem(`star-${storyId}-${key}`, val);
  };

  const score = useMemo(() => {
    const text = (s + t + a + r).toLowerCase();
    let val = 0;
    const keywords = {
      nexus_latency: ["500ms", "150ms", "django", "ros2", "celery", "redis", "telemetry", "postgres", "latency"],
      celery_iiot: ["celery", "redis", "sensor", "tag", "60k", "queue", "scale", "telemetry", "modbus"],
      rag_assistant: ["rag", "qdrant", "vector", "embedding", "router", "circuit breaker", "async", "ocr"]
    }[storyId as "nexus_latency" | "celery_iiot" | "rag_assistant"] ?? [];

    keywords.forEach((kw) => {
      if (text.includes(kw)) val += 15;
    });

    if (s.trim()) val += 10;
    if (t.trim()) val += 10;
    if (a.trim()) val += 15;
    if (r.trim()) val += 15;

    return Math.min(100, val);
  }, [s, t, a, r, storyId]);

  const scoreTips = useMemo(() => {
    const text = (s + t + a + r).toLowerCase();
    if (score < 40) return "Start typing your narrative. Focus on technical specifics!";
    if (storyId === "nexus_latency" && !text.includes("150ms")) {
      return "💡 TIP: Mention the specific latency reduction metric (500ms → 150ms) to prove business value.";
    }
    if (storyId === "celery_iiot" && !text.includes("60k")) {
      return "💡 TIP: Include the raw telemetry scale (60K+ sensor tags) to emphasize data volume.";
    }
    if (storyId === "rag_assistant" && !text.includes("circuit")) {
      return "💡 TIP: Explain the query router routing rules or vector search circuit breakers for high availability.";
    }
    return "🔥 Exceptional! Your STAR narrative has strong technical density. Be ready to verbalize this pitch.";
  }, [score, storyId, s, t, a, r]);

  return (
    <div className="border border-coffee/30 bg-cream-raised p-5 mt-6 space-y-4">
      <div className="flex justify-between items-center border-b border-coffee/15 pb-2">
        <div>
          <div className="label text-coffee">Interview Workbook</div>
          <h3 className="font-display text-lg font-bold text-espresso">Behavioral STAR Story Workbook</h3>
        </div>
        <select
          value={storyId}
          onChange={(e) => setStoryId(e.target.value)}
          className="bg-cream-base border hairline px-2.5 py-1.5 text-xs text-espresso focus:outline-none rounded-sm font-semibold"
        >
          <option value="nexus_latency">Nexus Automech Robotics (Latency)</option>
          <option value="celery_iiot">Scaling IIoT Cluster (Celery/Redis)</option>
          <option value="rag_assistant">GenAI Knowledge RAG Assistant</option>
        </select>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-[9px] text-coffee uppercase block mb-1">Situation (Context)</label>
              <textarea
                value={s}
                onChange={(e) => { setS(e.target.value); save("s", e.target.value); }}
                placeholder="What was the background environment?"
                className="w-full min-h-[65px] bg-cream-base border hairline p-2 text-xs leading-relaxed text-espresso focus:outline-none rounded-sm"
              />
            </div>
            <div>
              <label className="label text-[9px] text-coffee uppercase block mb-1">Task (Goal)</label>
              <textarea
                value={t}
                onChange={(e) => { setT(e.target.value); save("t", e.target.value); }}
                placeholder="What challenges did you need to solve?"
                className="w-full min-h-[65px] bg-cream-base border hairline p-2 text-xs leading-relaxed text-espresso focus:outline-none rounded-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-[9px] text-coffee uppercase block mb-1">Action (What you did)</label>
              <textarea
                value={a}
                onChange={(e) => { setA(e.target.value); save("a", e.target.value); }}
                placeholder="Describe your design choices and implementation steps."
                className="w-full min-h-[85px] bg-cream-base border hairline p-2 text-xs leading-relaxed text-espresso focus:outline-none rounded-sm"
              />
            </div>
            <div>
              <label className="label text-[9px] text-coffee uppercase block mb-1">Result (Quantifiable outcomes)</label>
              <textarea
                value={r}
                onChange={(e) => { setR(e.target.value); save("r", e.target.value); }}
                placeholder="State query speeds, volume size, or test improvements."
                className="w-full min-h-[85px] bg-cream-base border hairline p-2 text-xs leading-relaxed text-espresso focus:outline-none rounded-sm"
              />
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 border border-coffee/15 bg-cream-base/50 p-4 rounded-sm flex flex-col justify-between min-h-[160px]">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-espresso">Story Pitch Strength</span>
              <span className={`font-bold ${score > 75 ? "text-olive-deep font-bold" : score > 40 ? "text-coffee" : "text-clay-deep"}`}>
                {score}%
              </span>
            </div>
            <div className="h-2 w-full bg-cream-deep rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${score > 75 ? "bg-olive" : score > 40 ? "bg-clay" : "bg-clay-deep"}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          <div className="bg-cream-raised border border-coffee/10 p-3 rounded-sm text-[11px] leading-relaxed text-coffee mt-3 flex-grow flex items-center">
            <span className="italic">{scoreTips}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeetcodeQuizCard() {
  const [activeQ, setActiveQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("leetcode-quiz-score") ?? 0);
    }
    return 0;
  });

  const questions = [
    {
      q: "Given an unsorted array where you need to find a target sum pair, which is the most optimized approach?",
      opts: [
        "Sort array and use Two Pointers. O(N log N) time, O(1) space.",
        "Use a Hash Map lookup. O(N) time, O(N) space.",
        "Double loop nested search. O(N^2) time, O(1) space."
      ],
      correct: 1,
      explain: "✅ Hash Map lookup is optimal because it lets you check for the complement in O(1) time, yielding O(N) overall time complexity, albeit with O(N) auxiliary space."
    },
    {
      q: "To throttle incoming telemetry sensor logs to your ROS2 server at 100 reqs/sec, which algorithm is optimal?",
      opts: [
        "Token Bucket (supports burst traffic). O(1) execution time, O(1) memory.",
        "Sliding Window Log (logs timestamp arrays). O(N) execution time, O(N) memory.",
        "Fixed Window Counter (resets every minute, allows boundary spikes)."
      ],
      correct: 0,
      explain: "✅ Token Bucket is ideal for high-throughput robotics telemetry. It uses O(1) CPU/memory by tracking a single float counter of tokens, supporting burst traffic cleanly."
    },
    {
      q: "To map Many-to-Many linked skill tags for candidate cards in Django without N+1 query loop hits, which method is best?",
      opts: [
        "Candidate.objects.all() in a standard list loop.",
        "Candidate.objects.select_related('skills') lookup.",
        "Candidate.objects.prefetch_related('skills') lookup."
      ],
      correct: 2,
      explain: "✅ prefetch_related is optimal for Many-to-Many or reverse foreign keys. It fires exactly 2 SQL hits (fetching candidates, then linked skills in a single SELECT IN) and joins them in memory."
    }
  ];

  const current = questions[activeQ];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelectedOpt(idx);
    setAnswered(true);
    if (idx === current.correct) {
      const nextScore = score + 50;
      setScore(nextScore);
      localStorage.setItem("leetcode-quiz-score", String(nextScore));
    }
  };

  const handleNext = () => {
    setSelectedOpt(null);
    setAnswered(false);
    setActiveQ((prev) => (prev + 1) % questions.length);
  };

  return (
    <div className="reveal mt-6 border border-coffee/30 bg-cream-raised p-5 rounded-sm shadow-sm">
      <div className="flex items-center justify-between border-b border-coffee/15 pb-2.5 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-espresso uppercase tracking-wide">⚔️ Leetcode &amp; System Design Duel Simulator</h3>
          <p className="text-[10px] text-coffee mt-0.5">Test your active recall on interview patterns</p>
        </div>
        <span className="text-[10px] font-mono font-bold text-olive-deep bg-olive/10 px-2 py-0.5 rounded-sm">
          Prep Score: {score} XP
        </span>
      </div>

      <div className="space-y-4">
        <div className="bg-cream-base border border-coffee/15 p-4 rounded-sm">
          <span className="text-[9px] font-mono font-bold text-clay uppercase block mb-1">Question {activeQ + 1} of {questions.length}</span>
          <p className="text-xs sm:text-[13px] font-medium text-espresso leading-relaxed">{current.q}</p>
        </div>

        <div className="space-y-2">
          {current.opts.map((opt, idx) => {
            const isSelected = selectedOpt === idx;
            const isCorrect = idx === current.correct;
            return (
              <button
                key={idx}
                disabled={answered}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-3 text-xs rounded-sm border transition-all flex items-center justify-between ${
                  answered
                    ? isCorrect
                      ? "bg-olive/10 border-olive text-olive-deep font-semibold"
                      : isSelected
                      ? "bg-clay/10 border-clay text-clay-deep"
                      : "bg-cream-raised border-coffee/10 opacity-60 text-coffee-soft"
                    : "bg-cream-raised border-coffee/20 hover:border-coffee text-espresso hover:bg-cream-base"
                }`}
              >
                <span>{opt}</span>
                {answered && isCorrect && <span className="text-olive-deep font-bold shrink-0 ml-2">✓ Correct</span>}
                {answered && isSelected && !isCorrect && <span className="text-clay font-bold shrink-0 ml-2">✗ Incorrect</span>}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="bg-olive/[0.02] border border-olive/15 p-3 rounded-sm text-[11px] leading-relaxed text-coffee-soft font-mono">
              {current.explain}
            </div>
            
            <div className="flex justify-end">
              <Button variant="solid" onClick={handleNext}>
                {activeQ === questions.length - 1 ? "Start Over ↺" : "Next Question →"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
