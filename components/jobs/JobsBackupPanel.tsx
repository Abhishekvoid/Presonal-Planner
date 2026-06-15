"use client";

import { useRef, useState } from "react";
import { useJobs } from "@/lib/jobs/store";
import { JobsState } from "@/lib/jobs/types";
import { Button } from "@/components/primitives";

export function JobsBackupPanel({ onDone }: { onDone: () => void }) {
  const exportJobs = useJobs((s) => s.exportJobs);
  const importJobs = useJobs((s) => s.importJobs);
  const resetJobs = useJobs((s) => s.resetJobs);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = () => {
    const data = exportJobs();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `outreach-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Backup downloaded.");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as JobsState;
        if (!Array.isArray(data.companies) || !Array.isArray(data.templates)) {
          throw new Error("missing fields");
        }
        if (!confirm("Importing will replace your current outreach data. Continue?")) return;
        importJobs(data);
        setMsg("Backup restored.");
      } catch {
        setMsg("That file isn't a valid outreach backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-coffee">
        Your outreach data lives in this browser, separate from the study planner. Export a
        JSON backup to keep it safe or move it elsewhere. Importing replaces everything here.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="solid" onClick={doExport}>
          ↓ Export JSON
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          ↑ Import JSON
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doImport(f);
          e.target.value = "";
        }}
      />

      <div className="border-t hairline pt-4">
        <Button
          variant="danger"
          onClick={() => {
            if (confirm("Reset outreach data back to the sample companies and templates?")) {
              resetJobs();
              setMsg("Reset to the sample data.");
            }
          }}
        >
          Reset to samples
        </Button>
      </div>

      {msg && (
        <p className="text-sm text-olive-deep" role="status">
          {msg}
        </p>
      )}

      <div className="flex justify-end pt-1">
        <Button variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
    </div>
  );
}
