"use client";

import { FormEvent, useState } from "react";
import {
  Channel,
  CHANNELS,
  CHANNEL_LABEL,
  Company,
  Priority,
  PRIORITIES,
  Stage,
  STAGES,
  STAGE_LABEL,
} from "@/lib/jobs/types";
import { useJobs } from "@/lib/jobs/store";
import { Button, Field, inputClass } from "@/components/primitives";

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="label text-olive-deep border-b hairline pb-1.5 pt-1">{children}</div>
  );
}

export function CompanyForm({
  company,
  onDone,
}: {
  company?: Company;
  onDone: (id?: string) => void;
}) {
  const addCompany = useJobs((s) => s.addCompany);
  const updateCompany = useJobs((s) => s.updateCompany);

  const [f, setF] = useState({
    name: company?.name ?? "",
    role: company?.role ?? "",
    stage: company?.stage ?? ("lead" as Stage),
    priority: company?.priority ?? ("warm" as Priority),
    notes: company?.notes ?? "",
    contactName: company?.contactName ?? "",
    contactRole: company?.contactRole ?? "",
    channel: company?.channel ?? ("linkedin" as Channel),
    contactLink: company?.contactLink ?? "",
    draft: company?.draft ?? "",
    reachedOutAt: company?.reachedOutAt ?? "",
    followUpAt: company?.followUpAt ?? "",
    source: company?.source ?? "",
    website: company?.website ?? "",
    jobUrl: company?.jobUrl ?? "",
    location: company?.location ?? "",
    salary: company?.salary ?? "",
    tags: (company?.tags ?? []).join(", "),
    closedReason: company?.closedReason ?? "",
  });

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload: Partial<Company> = {
      name: f.name.trim(),
      role: f.role.trim(),
      stage: f.stage,
      priority: f.priority,
      notes: f.notes,
      contactName: f.contactName.trim(),
      contactRole: f.contactRole.trim(),
      channel: f.channel,
      contactLink: f.contactLink.trim(),
      draft: f.draft,
      reachedOutAt: f.reachedOutAt || undefined,
      followUpAt: f.followUpAt || undefined,
      source: f.source.trim(),
      website: f.website.trim() || undefined,
      jobUrl: f.jobUrl.trim() || undefined,
      location: f.location.trim() || undefined,
      salary: f.salary.trim() || undefined,
      tags: f.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      closedReason: f.stage === "closed" ? f.closedReason : undefined,
    };
    if (company) {
      updateCompany(company.id, payload);
      onDone(company.id);
    } else {
      const id = addCompany(payload);
      onDone(id);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Essentials */}
      <div className="space-y-3">
        <SectionLabel>Essentials</SectionLabel>
        <Field label="Company">
          <input
            className={inputClass}
            value={f.name}
            required
            autoFocus
            placeholder="Who are you reaching out to?"
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Role you're targeting">
          <input
            className={inputClass}
            value={f.role}
            placeholder="Backend Engineer, Platform"
            onChange={(e) => set("role", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage">
            <select
              className={inputClass}
              value={f.stage}
              onChange={(e) => set("stage", e.target.value as Stage)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className={inputClass}
              value={f.priority}
              onChange={(e) => set("priority", e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {f.stage === "closed" && (
          <Field label="Closed reason">
            <input
              className={inputClass}
              value={f.closedReason}
              placeholder="Rejected, ghosted, no longer pursuing…"
              onChange={(e) => set("closedReason", e.target.value)}
            />
          </Field>
        )}
        <Field label="Notes">
          <textarea
            className={`${inputClass} min-h-[56px] resize-y`}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>

      {/* Outreach */}
      <div className="space-y-3">
        <SectionLabel>Outreach</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact name">
            <input
              className={inputClass}
              value={f.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </Field>
          <Field label="Contact role">
            <input
              className={inputClass}
              value={f.contactRole}
              onChange={(e) => set("contactRole", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Channel">
            <select
              className={inputClass}
              value={f.channel}
              onChange={(e) => set("channel", e.target.value as Channel)}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={f.channel === "email" ? "Email address" : "Profile link"}>
            <input
              className={inputClass}
              type={f.channel === "email" ? "email" : "text"}
              value={f.contactLink}
              placeholder={f.channel === "email" ? "name@company.com" : "https://"}
              onChange={(e) => set("contactLink", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Message draft">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={f.draft}
            placeholder="Your DM. Fill from a template in the detail view."
            onChange={(e) => set("draft", e.target.value)}
          />
        </Field>
      </div>

      {/* Tracking */}
      <div className="space-y-3">
        <SectionLabel>Tracking</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reached out">
            <input
              type="date"
              className={inputClass}
              value={f.reachedOutAt}
              onChange={(e) => set("reachedOutAt", e.target.value)}
            />
          </Field>
          <Field label="Follow up by">
            <input
              type="date"
              className={inputClass}
              value={f.followUpAt}
              onChange={(e) => set("followUpAt", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Where you found the lead">
          <input
            className={inputClass}
            value={f.source}
            onChange={(e) => set("source", e.target.value)}
          />
        </Field>
      </div>

      {/* Optional extras */}
      <details className="group">
        <summary className="label text-coffee cursor-pointer list-none py-1 hover:text-espresso">
          + Optional extras
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Website">
              <input
                className={inputClass}
                value={f.website}
                placeholder="https://"
                onChange={(e) => set("website", e.target.value)}
              />
            </Field>
            <Field label="Job posting URL">
              <input
                className={inputClass}
                value={f.jobUrl}
                placeholder="https://"
                onChange={(e) => set("jobUrl", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location / remote">
              <input
                className={inputClass}
                value={f.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
            <Field label="Salary range">
              <input
                className={inputClass}
                value={f.salary}
                onChange={(e) => set("salary", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Tags (comma separated)">
            <input
              className={inputClass}
              value={f.tags}
              placeholder="robotics, remote, dream"
              onChange={(e) => set("tags", e.target.value)}
            />
          </Field>
        </div>
      </details>

      <div className="flex justify-end gap-2 border-t hairline pt-4">
        <Button variant="ghost" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" variant="solid">
          {company ? "Save company" : "Add company"}
        </Button>
      </div>
    </form>
  );
}
