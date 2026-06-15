"use client";

import { useEffect, useState } from "react";
import { Company, STAGE_LABEL } from "@/lib/jobs/types";
import { useJobs } from "@/lib/jobs/store";
import { fillTemplate } from "@/lib/jobs/templates";
import { Button } from "@/components/primitives";
import { StageDot, PriorityDot, ChannelTag, shortDate } from "./bits";

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="label w-28 shrink-0 text-coffee">{label}</span>
      <span className="min-w-0 text-espresso break-words">{children}</span>
    </div>
  );
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-olive-deep underline decoration-olive/40 underline-offset-2 hover:decoration-olive"
    >
      {children}
    </a>
  );
}

export function CompanyDetail({
  company,
  onEdit,
  onClose,
}: {
  company: Company;
  onEdit: () => void;
  onClose: () => void;
}) {
  const templates = useJobs((s) => s.templates);
  const updateCompany = useJobs((s) => s.updateCompany);
  const deleteCompany = useJobs((s) => s.deleteCompany);

  const [draft, setDraft] = useState(company.draft);
  const [picked, setPicked] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep local draft in sync if the company changes underneath (e.g. edit).
  useEffect(() => setDraft(company.draft), [company.id, company.draft]);

  const persistDraft = () => {
    if (draft !== company.draft) updateCompany(company.id, { draft });
  };

  const applyTemplate = (id: string) => {
    setPicked(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const filled = fillTemplate(tpl.body, company);
    setDraft(filled);
    updateCompany(company.id, { draft: filled });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback: select the textarea so the user can copy manually.
      const el = document.getElementById(`draft-${company.id}`) as HTMLTextAreaElement | null;
      el?.select();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {company.role && <p className="text-sm text-coffee">{company.role}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PriorityDot p={company.priority} withLabel />
          <span className="flex items-center gap-1.5 border hairline px-2 py-1">
            <StageDot stage={company.stage} />
            <span className="label text-espresso">{STAGE_LABEL[company.stage]}</span>
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="border-t hairline pt-1">
        <MetaRow label="Contact">
          {company.contactName && (
            <>
              {company.contactName}
              {company.contactRole && (
                <span className="text-coffee"> · {company.contactRole}</span>
              )}
            </>
          )}
        </MetaRow>
        <MetaRow label="Channel">
          <span className="inline-flex items-center gap-2">
            <ChannelTag channel={company.channel} />
            {company.contactLink && <Link href={company.contactLink}>profile</Link>}
          </span>
        </MetaRow>
        <MetaRow label="Reached out">{shortDate(company.reachedOutAt)}</MetaRow>
        <MetaRow label="Follow up">{shortDate(company.followUpAt)}</MetaRow>
        <MetaRow label="Source">{company.source}</MetaRow>
        <MetaRow label="Location">{company.location}</MetaRow>
        <MetaRow label="Salary">{company.salary}</MetaRow>
        <MetaRow label="Website">
          {company.website && <Link href={company.website}>{company.website}</Link>}
        </MetaRow>
        <MetaRow label="Job post">
          {company.jobUrl && <Link href={company.jobUrl}>posting</Link>}
        </MetaRow>
        <MetaRow label="Tags">
          {company.tags.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {company.tags.map((t) => (
                <span key={t} className="label !text-[9px] border hairline px-1.5 py-[1px] text-coffee">
                  {t}
                </span>
              ))}
            </span>
          )}
        </MetaRow>
        <MetaRow label="Closed reason">{company.closedReason}</MetaRow>
      </div>

      {company.notes && (
        <div className="border hairline bg-cream-base p-3">
          <div className="label text-coffee mb-1">Notes</div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-espresso">
            {company.notes}
          </p>
        </div>
      )}

      {/* Draft + templates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="label text-olive-deep">Message draft</div>
          <button
            onClick={copy}
            className="label text-coffee hover:text-espresso transition-colors disabled:opacity-40"
            disabled={!draft.trim()}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>

        {templates.length > 0 ? (
          <select
            value={picked}
            onChange={(e) => applyTemplate(e.target.value)}
            className="w-full bg-cream-base border hairline px-3 py-2 text-sm text-espresso focus:border-olive focus:outline-none"
          >
            <option value="">Fill from template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-coffee">
            No templates yet. Create one from the Templates button.
          </p>
        )}

        <textarea
          id={`draft-${company.id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={persistDraft}
          placeholder="Write or fill your message here."
          className="min-h-[110px] w-full resize-y bg-cream-base border hairline px-3 py-2 text-sm leading-relaxed text-espresso placeholder:text-coffee/70 focus:border-olive focus:outline-none"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t hairline pt-4">
        {confirmDelete ? (
          <>
            <span className="text-sm text-clay-deep">Delete this company?</span>
            <Button
              variant="danger"
              className="ml-auto"
              onClick={() => {
                deleteCompany(company.id);
                onClose();
              }}
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </>
        ) : (
          <>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            <Button variant="solid" className="ml-auto" onClick={onEdit}>
              Edit
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
