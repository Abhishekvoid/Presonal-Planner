"use client";

import { useRef, useState } from "react";
import { usePlanner } from "@/lib/store";
import { PlannerState } from "@/lib/types";
import { Button } from "./primitives";

export function BackupPanel({ onDone }: { onDone: () => void }) {
  const exportState = usePlanner((s) => s.exportState);
  const importState = usePlanner((s) => s.importState);
  const resetToSeed = usePlanner((s) => s.resetToSeed);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = () => {
    const data = exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `planner-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Backup downloaded.");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as PlannerState;
        if (!Array.isArray(data.tasks) || !Array.isArray(data.days) || !Array.isArray(data.tracks)) {
          throw new Error("missing fields");
        }
        if (!confirm("Importing will replace your current data. Continue?")) return;
        importState(data, "replace");
        setMsg("Backup restored.");
      } catch {
        setMsg("That file isn't a valid planner backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-coffee">
        Your data lives in this browser. Export a JSON backup to keep it safe or move it to
        another device. Importing replaces everything currently here.
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
            if (confirm("Reset everything back to the original seeded plan? This erases your progress.")) {
              resetToSeed();
              setMsg("Reset to the original plan.");
            }
          }}
        >
          Reset to original plan
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
