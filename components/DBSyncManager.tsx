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
          // Hydrate client stores with Neon database values
          console.log("[DBSyncManager] Hydrating client stores from Neon DB...");
          usePlanner.getState().importState(data, "replace");
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
          companies: jobs.companies,
          templates: jobs.templates,
        }),
      });
      if (!res.ok) throw new Error("Sync upload failed");
      console.log("[DBSyncManager] Neon DB synced successfully.");
    } catch (err) {
      console.error("[DBSyncManager] Neon DB sync failed:", err);
    }
  }

  // 2. React to modifications: Subscribe & Debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Subscribe to store updates, skipping initial load changes
    const unsubPlanner = usePlanner.subscribe(() => {
      if (!isHydratedRef.current) return;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const pState = usePlanner.getState().exportState();
        const jState = useJobs.getState().exportJobs();
        pushStateToDB(pState, jState);
      }, 2000); // 2 second debounce to bundle rapid UI updates
    });

    const unsubJobs = useJobs.subscribe(() => {
      if (!isHydratedRef.current) return;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const pState = usePlanner.getState().exportState();
        const jState = useJobs.getState().exportJobs();
        pushStateToDB(pState, jState);
      }, 2000);
    });

    return () => {
      unsubPlanner();
      unsubJobs();
      clearTimeout(timeoutId);
    };
  }, []);

  return null; // Headless component coordinating database synchronization
}
export default DBSyncManager;
