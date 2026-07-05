"use client";

import { FormEvent, useState } from "react";
import {
  Channel,
  CHANNELS,
  CHANNEL_LABEL,
  Company,
  Contact,
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

  const [activeTab, setActiveTab] = useState<"essentials" | "outreach" | "tracking">("essentials");

  const [contacts, setContacts] = useState<Contact[]>(() => {
    if (company?.contacts && company.contacts.length > 0) {
      return company.contacts;
    }
    return [
      {
        id: "ct-init-0",
        name: company?.contactName ?? "",
        role: company?.contactRole ?? "",
        channel: company?.channel ?? "linkedin",
        link: company?.contactLink ?? "",
        draft: company?.draft ?? "",
      },
    ];
  });

  const [f, setF] = useState({
    name: company?.name ?? "",
    role: company?.role ?? "",
    stage: company?.stage ?? ("lead" as Stage),
    priority: company?.priority ?? ("warm" as Priority),
    notes: company?.notes ?? "",
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

  const addContactRow = () => {
    setContacts((prev) => [
      ...prev,
      {
        id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: "",
        role: "",
        channel: "linkedin",
        link: "",
        draft: "",
      },
    ]);
  };

  const updateContactField = (index: number, key: keyof Contact, value: any) => {
    setContacts((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, [key]: value } : c))
    );
  };

  const removeContactRow = (index: number) => {
    setContacts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const validContacts = contacts.filter((c) => c.name.trim() || c.link.trim());
    const primaryContact = validContacts[0] || {
      name: "",
      role: "",
      channel: "linkedin" as Channel,
      link: "",
      draft: "",
    };

    const payload: Partial<Company> = {
      name: f.name.trim(),
      role: f.role.trim(),
      stage: f.stage,
      priority: f.priority,
      notes: f.notes,
      contactName: primaryContact.name.trim(),
      contactRole: primaryContact.role.trim(),
      channel: primaryContact.channel,
      contactLink: primaryContact.link.trim(),
      draft: primaryContact.draft,
      contacts: validContacts,
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

  const isEssentialsValid = f.name.trim().length > 0;

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Tab Switcher */}
      <div className="flex border-b border-coffee/20">
        {(
          [
            { id: "essentials", label: "1. Essentials" },
            { id: "outreach", label: "2. Outreach" },
            { id: "tracking", label: "3. Tracking & Extras" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.id !== "essentials" && !isEssentialsValid) return;
              setActiveTab(tab.id);
            }}
            disabled={tab.id !== "essentials" && !isEssentialsValid}
            className={`flex-1 pb-2.5 text-center text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-[2px] ${
              !isEssentialsValid && tab.id !== "essentials"
                ? "opacity-50 cursor-not-allowed border-transparent text-coffee/40"
                : ""
            } ${
              activeTab === tab.id
                ? "border-espresso text-espresso"
                : "border-transparent text-coffee hover:text-espresso"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Essentials */}
      {activeTab === "essentials" && (
        <div className="space-y-3.5">
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
              className={`${inputClass} min-h-[80px] resize-y`}
              value={f.notes}
              placeholder="Private details, logs, or comments..."
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* Tab 2: Outreach */}
      {activeTab === "outreach" && (
        <div className="space-y-4">
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
            {contacts.map((contact, index) => (
              <div
                key={contact.id}
                className="border border-coffee/20 bg-cream-base/30 p-4 space-y-3 relative rounded-sm"
              >
                {contacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeContactRow(index)}
                    className="absolute top-3 right-3 text-[10px] font-bold text-clay-deep uppercase tracking-wider hover:text-clay transition-colors"
                  >
                    ✕ Remove
                  </button>
                )}
                <div className="label text-[9px] text-coffee/60 uppercase tracking-wider">
                  Employee #{index + 1}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contact name">
                    <input
                      className={inputClass}
                      value={contact.name}
                      placeholder="e.g. John Doe"
                      onChange={(e) => updateContactField(index, "name", e.target.value)}
                    />
                  </Field>
                  <Field label="Contact role">
                    <input
                      className={inputClass}
                      value={contact.role}
                      placeholder="e.g. Recruiter, EM, Founder"
                      onChange={(e) => updateContactField(index, "role", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Channel">
                    <select
                      className={inputClass}
                      value={contact.channel}
                      onChange={(e) => updateContactField(index, "channel", e.target.value as Channel)}
                    >
                      {CHANNELS.map((c) => (
                        <option key={c} value={c}>
                          {CHANNEL_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={contact.channel === "email" ? "Email address" : "Profile link"}>
                    <input
                      className={inputClass}
                      type={contact.channel === "email" ? "email" : "text"}
                      value={contact.link}
                      placeholder={contact.channel === "email" ? "name@company.com" : "https://"}
                      onChange={(e) => updateContactField(index, "link", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Message draft">
                  <textarea
                    className={`${inputClass} min-h-[64px] resize-y`}
                    value={contact.draft}
                    placeholder="Your custom DM draft/template for this employee..."
                    onChange={(e) => updateContactField(index, "draft", e.target.value)}
                  />
                </Field>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full text-xs font-bold uppercase tracking-wider py-2.5 border-dashed"
            onClick={addContactRow}
          >
            + Add Another Employee / Contact
          </Button>
        </div>
      )}

      {/* Tab 3: Tracking & Extras */}
      {activeTab === "tracking" && (
        <div className="space-y-3.5">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location / remote">
              <input
                className={inputClass}
                value={f.location}
                placeholder="e.g. Bangalore, Remote"
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
            <Field label="Salary range">
              <input
                className={inputClass}
                value={f.salary}
                placeholder="e.g. ₹24L - ₹32L"
                onChange={(e) => set("salary", e.target.value)}
              />
            </Field>
          </div>
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
            <Field label="Where you found lead">
              <input
                className={inputClass}
                value={f.source}
                placeholder="e.g. Wellfound, Twitter"
                onChange={(e) => set("source", e.target.value)}
              />
            </Field>
            <Field label="Tags (comma separated)">
              <input
                className={inputClass}
                value={f.tags}
                placeholder="robotics, remote, dream"
                onChange={(e) => set("tags", e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}

      {/* Footer Navigation Buttons */}
      <div className="flex justify-between items-center border-t border-coffee/20 pt-4 mt-6">
        <div>
          {activeTab !== "essentials" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (activeTab === "tracking") setActiveTab("outreach");
                else if (activeTab === "outreach") setActiveTab("essentials");
              }}
            >
              ← Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" type="button" onClick={() => onDone()}>
            Cancel
          </Button>
          {activeTab !== "tracking" ? (
            <Button
              type="button"
              variant="solid"
              disabled={!isEssentialsValid}
              onClick={() => {
                if (activeTab === "essentials") setActiveTab("outreach");
                else if (activeTab === "outreach") setActiveTab("tracking");
              }}
            >
              Next step →
            </Button>
          ) : (
            <Button type="submit" variant="solid" disabled={!isEssentialsValid}>
              {company ? "Save company" : "Add company"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
