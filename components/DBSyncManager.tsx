"use client";

import { useEffect, useRef } from "react";
import { usePlanner } from "@/lib/store";
import { useJobs } from "@/lib/jobs/store";

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
          
          // Merge kv: keep any local entries (e.g. freshly migrated from legacy
          // localStorage, or edits not yet pushed) over the DB snapshot.
          const mergedKv = { ...(data.kv || {}), ...(localState.kv || {}) };

          const mergedData = {
            ...data,
            notes: mergedNotes,
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
        isHydratedRef.current = true;
        // Explicitly set store hydration flags to trigger render mounting
        usePlanner.getState().setHasHydrated(true);
        useJobs.getState().setHasHydrated(true);
      }
    }
    
    loadInitialData();
  }, []);

  // Helper to push state to the sync endpoint
  async function pushStateToDB(planner: any, jobs: any) {
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
        keepalive: true,
      });
      if (!res.ok) throw new Error("Sync upload failed");
      console.log("[DBSyncManager] Neon DB synced successfully.");
    } catch (err) {
      console.error("[DBSyncManager] Neon DB sync failed:", err);
    }
  }

  // 2. React to modifications: Subscribe & Debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingPush = false;

    const flushSync = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pendingPush) {
        pendingPush = false;
        console.log("[DBSyncManager] Flushing state push to Neon DB immediately...");
        const pState = usePlanner.getState().exportState();
        const jState = useJobs.getState().exportJobs();
        pushStateToDB(pState, jState);
      }
    };

    // Subscribe to store updates, skipping initial load changes
    const unsubPlanner = usePlanner.subscribe((state, prevState) => {
      if (!isHydratedRef.current) return;

      // If active tab view changed, flush any pending save immediately
      if (state.activeView !== prevState.activeView) {
        flushSync();
        return;
      }

      pendingPush = true;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        flushSync();
      }, 2000); // 2 second debounce to bundle rapid UI updates
    });

    const unsubJobs = useJobs.subscribe(() => {
      if (!isHydratedRef.current) return;

      pendingPush = true;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        flushSync();
      }, 2000);
    });

    // Also register an unload / beforeunload handler to flush any pending save on page close/reload
    const handleBeforeUnload = () => {
      flushSync();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubPlanner();
      unsubJobs();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return null; // Headless component coordinating database synchronization
}
export default DBSyncManager;
