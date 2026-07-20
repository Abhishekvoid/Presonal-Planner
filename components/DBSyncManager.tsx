"use client";

import { useEffect, useRef } from "react";
import { usePlanner } from "@/lib/store";
import { useJobs } from "@/lib/jobs/store";
import { mergeById, mergeKv } from "@/lib/syncMerge";

/**
 * Device-local marker for "this browser has edits the debounced push never
 * flushed". Survives reload (that is the whole point) and stays in raw
 * localStorage rather than the synced kv bag because it describes this device's
 * push state, not user data.
 */
const UNPUSHED_KEY = "planner-unpushed";

const hasUnpushedEdits = () => {
  try {
    return localStorage.getItem(UNPUSHED_KEY) === "1";
  } catch {
    return false;
  }
};

const setUnpushedEdits = (v: boolean) => {
  try {
    if (v) localStorage.setItem(UNPUSHED_KEY, "1");
    else localStorage.removeItem(UNPUSHED_KEY);
  } catch {
    /* ignore */
  }
};

export function DBSyncManager() {
  const plannerState = usePlanner();
  const jobsState = useJobs();
  const isHydratedRef = useRef(false);

  // 1. Initial Load: Hydrate from Neon DB
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch("/api/sync");
        if (!res.ok) throw new Error("Sync load failed");
        
        const data = await res.json();
        
        if (data.empty) {
          // Database is empty. Seed Neon DB with current LocalStorage client state!
          console.log("[DBSyncManager] Neon DB is empty. Seeding with current local state...");
          const pState = usePlanner.getState().exportState();
          const jState = useJobs.getState().exportJobs();
          await pushStateToDB(pState, jState);
        } else {
          // Hydrate client stores with Neon database values (merging note changes)
          console.log("[DBSyncManager] Hydrating client stores from Neon DB...");
          
          const localState = usePlanner.getState();
          const dbNotes = data.notes || [];
          const localNotes = localState.notes || [];
          
          // Merge notes: compare updatedAt timestamps
          const mergedNotes = [...dbNotes];
          localNotes.forEach((localNote) => {
            const dbNoteIndex = mergedNotes.findIndex((n) => n.id === localNote.id);
            if (dbNoteIndex === -1) {
              // Exists locally but not in DB -> keep local
              mergedNotes.push(localNote);
            } else {
              const dbNote = mergedNotes[dbNoteIndex];
              const localTime = new Date(localNote.updatedAt).getTime();
              const dbTime = new Date(dbNote.updatedAt).getTime();
              if (localTime > dbTime) {
                // Local version is newer -> overwrite DB version in merge
                mergedNotes[dbNoteIndex] = localNote;
              }
            }
          });
          
          // Merge days by updatedAt so a local edit (e.g. a revision saved just
          // before a reload) isn't clobbered by a staler Neon copy when the
          // debounced push hadn't landed yet. Mirrors the notes merge above.
          const dbDays = data.days || [];
          const localDays = localState.days || [];
          const mergedDays = [...dbDays];
          localDays.forEach((localDay) => {
            const idx = mergedDays.findIndex((d) => d.id === localDay.id);
            if (idx === -1) {
              mergedDays.push(localDay);
            } else {
              const localTime = new Date(localDay.updatedAt || 0).getTime();
              const dbTime = new Date(mergedDays[idx].updatedAt || 0).getTime();
              // Tie favours local so a local edit made before updatedAt was
              // tracked (or before its push landed) is never lost; a genuinely
              // newer edit on another device carries a real timestamp and wins.
              if (localTime >= dbTime) mergedDays[idx] = localDay;
            }
          });

          // Tasks, sessions and kv used to be taken wholesale from Neon, which
          // discarded any tick or study block the 2s debounce hadn't pushed yet
          // — the cause of checkboxes and focus minutes resetting on reload.
          // Local only wins while it is flagged as holding unpushed edits; on a
          // fresh browser local is just buildSeed() and must never clobber Neon.
          const localWins = hasUnpushedEdits();
          const mergedTasks = localWins
            ? mergeById(data.tasks || [], localState.tasks || [])
            : data.tasks || [];
          const mergedSessions = localWins
            ? mergeById(data.sessions || [], localState.sessions || [])
            : data.sessions || [];
          const mergedKv = mergeKv(data.kv || {}, localState.kv || {}, localWins);

          const mergedData = {
            ...data,
            days: mergedDays,
            notes: mergedNotes,
            tasks: mergedTasks,
            sessions: mergedSessions,
            kv: mergedKv,
          };
          
          usePlanner.getState().importState(mergedData, "replace");
          useJobs.getState().importJobs({
            version: data.companiesVersion || 1,
            companies: data.companies,
            templates: data.templates,
          });
        }
      } catch (err) {
        console.error("[DBSyncManager] Initial load error:", err);
      } finally {
        // Flip the hydration flags *before* arming the subscriber, otherwise
        // hydration itself counts as a local edit: it marked the store dirty
        // and fired a redundant full-state push on every page load.
        usePlanner.getState().setHasHydrated(true);
        useJobs.getState().setHasHydrated(true);
        isHydratedRef.current = true;
      }
    }
    
    loadInitialData();
  }, []);

  // Helper to push state to the sync endpoint.
  // `keepalive` is only for the unload path: the Fetch spec caps keepalive
  // request bodies at 64 KiB total, and a full planner payload (tasks, notes,
  // sessions, companies) can exceed that — the browser then rejects the request
  // outright. Sending it on ordinary in-page pushes bought nothing and risked
  // failing every single save.
  async function pushStateToDB(planner: any, jobs: any, keepalive = false) {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: planner.tracks,
          tasks: planner.tasks,
          days: planner.days,
          sessions: planner.sessions,
          reflections: planner.reflections,
          focusSettings: planner.focusSettings,
          activeTimer: planner.activeTimer,
          notes: planner.notes,
          kv: planner.kv,
          companies: jobs.companies,
          templates: jobs.templates,
        }),
        keepalive,
      });
      if (!res.ok) throw new Error(`Sync upload failed (${res.status})`);
      // Neon now holds everything local does — stop preferring local on hydrate.
      setUnpushedEdits(false);
      console.log("[DBSyncManager] Neon DB synced successfully.");
    } catch (err) {
      // Leave the unpushed flag set so the next hydrate keeps local edits.
      console.error("[DBSyncManager] Neon DB sync failed:", err);
    }
  }

  // 2. React to modifications: Subscribe & Debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingPush = false;

    const flushSync = (keepalive = false) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pendingPush) {
        pendingPush = false;
        console.log("[DBSyncManager] Flushing state push to Neon DB immediately...");
        const pState = usePlanner.getState().exportState();
        const jState = useJobs.getState().exportJobs();
        pushStateToDB(pState, jState, keepalive);
      }
    };

    // Any local mutation is unpushed until a push confirms otherwise. Set this
    // before scheduling, so a reload inside the debounce window still finds it.
    const markDirty = () => {
      setUnpushedEdits(true);
      pendingPush = true;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => flushSync(), 2000);
    };

    // Subscribe to store updates, skipping initial load changes
    const unsubPlanner = usePlanner.subscribe((state, prevState) => {
      if (!isHydratedRef.current) return;

      // If active tab view changed, flush any pending save immediately
      if (state.activeView !== prevState.activeView) {
        setUnpushedEdits(true);
        pendingPush = true;
        flushSync();
        return;
      }

      markDirty(); // 2 second debounce to bundle rapid UI updates
    });

    const unsubJobs = useJobs.subscribe(() => {
      if (!isHydratedRef.current) return;
      markDirty();
    });

    // Flush while the page is still alive. `beforeunload` fires too late for a
    // normal fetch and too big for a keepalive one, so it is only a last resort;
    // `visibilitychange` is the reliable signal for reload, tab switch and close.
    const handleHidden = () => {
      if (document.visibilityState === "hidden") flushSync();
    };
    const handleBeforeUnload = () => flushSync(true);
    document.addEventListener("visibilitychange", handleHidden);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubPlanner();
      unsubJobs();
      document.removeEventListener("visibilitychange", handleHidden);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return null; // Headless component coordinating database synchronization
}
export default DBSyncManager;
