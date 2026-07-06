"use client";

import { useState } from "react";
import { useJobs } from "@/lib/jobs/store";
import { fillTemplate, PLACEHOLDERS } from "@/lib/jobs/templates";
import { Company, Template } from "@/lib/jobs/types";
import { Button, Field, inputClass } from "@/components/primitives";

/** Sample used for the live preview when there are no companies yet. */
const SAMPLE: Pick<Company, "name" | "contactName" | "role"> = {
  name: "Skild AI",
  contactName: "Priya",
  role: "Backend Engineer",
};

export function TemplateManager() {
  const templates = useJobs((s) => s.templates);
  const companies = useJobs((s) => s.companies);
  const addTemplate = useJobs((s) => s.addTemplate);
  const updateTemplate = useJobs((s) => s.updateTemplate);
  const deleteTemplate = useJobs((s) => s.deleteTemplate);

  const previewWith = companies[0] ?? SAMPLE;

  const [editing, setEditing] = useState<Template | "new" | null>(null);

  if (editing) {
    return (
      <TemplateEditor
        template={editing === "new" ? undefined : editing}
        previewWith={previewWith}
        onSave={(name, body) => {
          if (editing === "new") addTemplate({ name, body });
          else updateTemplate(editing.id, { name, body });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {templates.length === 0 ? (
        <p className="border hairline bg-cream-base px-4 py-8 text-center text-sm text-coffee">
          No templates yet. Create one and reuse it across every cold DM.
        </p>
      ) : (
        <ul className="divide-y divide-coffee/20 border hairline bg-cream-base">
          {templates.map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-bold tracking-tightest text-espresso">
                  {t.name}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-coffee">
                  {t.body}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(t)}
                  className="label text-coffee hover:text-espresso transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="label text-coffee hover:text-clay-deep transition-colors"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="solid" onClick={() => setEditing("new")}>
        + New template
      </Button>
    </div>
  );
}

function TemplateEditor({
  template,
  previewWith,
  onSave,
  onCancel,
}: {
  template?: Template;
  previewWith: Pick<Company, "name" | "contactName" | "role"> & Record<string, any>;
  onSave: (name: string, body: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [body, setBody] = useState(template?.body ?? "");

  return (
    <div className="space-y-4">
      <Field label="Template name">
        <input
          className={inputClass}
          value={name}
          autoFocus
          placeholder="LinkedIn intro"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Message body">
        <textarea
          className={`${inputClass} min-h-[120px] resize-y`}
          value={body}
          placeholder="Hi {name}, I came across {company}…"
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>

      <div className="text-xs text-coffee">
        Placeholders:{" "}
        {PLACEHOLDERS.map((p) => (
          <code key={p} className="mr-1 bg-cream-deep px-1 py-[1px] text-espresso">
            {p}
          </code>
        ))}
      </div>

      {body.trim() && (
        <div className="border hairline bg-cream-base p-3">
          <div className="label text-coffee mb-1">Preview · {previewWith.name}</div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-espresso">
            {fillTemplate(body, previewWith)}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t hairline pt-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="solid"
          disabled={!name.trim() || !body.trim()}
          onClick={() => onSave(name.trim(), body)}
        >
          Save template
        </Button>
      </div>
    </div>
  );
}
