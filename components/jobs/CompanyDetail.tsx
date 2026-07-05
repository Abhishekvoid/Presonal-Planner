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

  const [selectedContactId, setSelectedContactId] = useState(company.contacts?.[0]?.id ?? "");
  const [picked, setPicked] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pitchStyle, setPitchStyle] = useState("raw_founder");

  // Update selected contact if active ID is not in new contacts list
  useEffect(() => {
    if (company.contacts && !company.contacts.some((c) => c.id === selectedContactId)) {
      setSelectedContactId(company.contacts[0]?.id ?? "");
    }
  }, [company.contacts, selectedContactId]);

  const activeContact = company.contacts?.find((c) => c.id === selectedContactId) || company.contacts?.[0];

  const [draft, setDraft] = useState(activeContact?.draft ?? "");

  // Sync draft state when active contact switches
  useEffect(() => {
    setDraft(activeContact?.draft ?? "");
  }, [activeContact]);

  const persistDraft = () => {
    if (!activeContact) return;
    if (draft !== activeContact.draft) {
      const updatedContacts = company.contacts.map((c) =>
        c.id === activeContact.id ? { ...c, draft } : c
      );
      const primaryDraft = activeContact.id === company.contacts[0]?.id ? draft : company.draft;
      updateCompany(company.id, { contacts: updatedContacts, draft: primaryDraft });
    }
  };

  const applyTemplate = (id: string) => {
    if (!activeContact) return;
    setPicked(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const filled = fillTemplate(tpl.body, {
      ...company,
      contactName: activeContact.name,
      contactRole: activeContact.role,
    });
    setDraft(filled);
    const updatedContacts = company.contacts.map((c) =>
      c.id === activeContact.id ? { ...c, draft: filled } : c
    );
    const primaryDraft = activeContact.id === company.contacts[0]?.id ? filled : company.draft;
    updateCompany(company.id, { contacts: updatedContacts, draft: primaryDraft });
  };

  const generateAIPitch = () => {
    if (!activeContact) return;
    const contactName = activeContact.name ? activeContact.name.split(" ")[0] : "Team";
    const companyName = company.name || "your team";

    let text = "";
    if (pitchStyle === "raw_founder") {
      text = `Hi ${contactName},\n\nSaw you're building at ${companyName}. I'm a Backend Dev (ex-Nexus Automech) specializing in high-performance platforms. At Nexus, I slashed robotics telemetry query latency from 500ms to 150ms using optimized Django Querysets (select_related/prefetch_related) and ROS2. Scale-wise, I also set up a Celery/Redis cluster handling 60K+ sensor tags.\n\nSince you are building in this stack, would love to join your team. Let's chat?\n\nBest,\nAbhishek`;
    } else if (pitchStyle === "standard_referral") {
      text = `Hello ${contactName},\n\nHope this finds you well. I'm reaching out regarding backend opportunities at ${companyName}. I have 1.5+ years of experience building scalable python systems. Recently, I scaled a multi-tenant IIoT telemetry ingestion engine utilizing Django, Celery, and Redis to process 60k+ data tags. I also built a GenAI RAG search agent utilizing vector DBs (Qdrant), reranking, and query routing circuit breakers.\n\nI would love to learn more about the engineering challenges at ${companyName} and see if my background matches your needs.\n\nRegards,\nAbhishek`;
    } else if (pitchStyle === "linkedin_connect") {
      text = `Hi ${contactName}, saw your work at ${companyName}. I'm a Software Dev specializing in high-performance Django architectures (slashed robotics latency 500ms->150ms) and GenAI/RAG query routers. Would love to connect and keep track of your engineering updates!`;
    }

    setDraft(text);
    const updatedContacts = company.contacts.map((c) =>
      c.id === activeContact.id ? { ...c, draft: text } : c
    );
    const primaryDraft = activeContact.id === company.contacts[0]?.id ? text : company.draft;
    updateCompany(company.id, { contacts: updatedContacts, draft: primaryDraft });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
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
        {company.contacts && company.contacts.length > 0 && (
          <div className="py-2.5 border-b hairline">
            <div className="label text-coffee mb-2">Target Contacts ({company.contacts.length})</div>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
              {company.contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between gap-3 bg-cream-base border border-coffee/10 px-2.5 py-2 rounded-sm text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-espresso">
                      {contact.name || "Unnamed Contact"}
                    </span>
                    {contact.role && (
                      <span className="text-coffee ml-1 text-[10px]">· {contact.role}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ChannelTag channel={contact.channel} link={contact.link} />
                    {contact.link && (
                      <a
                        href={contact.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-olive-deep underline hover:text-espresso"
                      >
                        Open Link
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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

        {/* Contact switcher pills for Draft */}
        {company.contacts && company.contacts.length > 1 && (
          <div className="flex flex-wrap gap-1.5 py-1">
            {company.contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedContactId(c.id)}
                className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full border transition-colors ${
                  selectedContactId === c.id
                    ? "bg-espresso text-cream-base border-espresso"
                    : "bg-cream-base border-coffee/20 text-coffee hover:text-espresso"
                }`}
              >
                {c.name || "Unnamed"}
              </button>
            ))}
          </div>
        )}

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

        {/* Resume-to-Pitch Personalizer UI */}
        <div className="bg-olive/[0.03] border border-olive/20 p-3 rounded-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="label text-[10px] text-olive-deep font-bold">⚡ RESUME-TO-PITCH PERSONALIZER</span>
            <span className="text-[9px] text-coffee font-mono">Robot/AI Spec</span>
          </div>
          <div className="flex gap-2">
            <select
              value={pitchStyle}
              onChange={(e) => setPitchStyle(e.target.value)}
              className="flex-1 bg-cream-base border hairline px-2 py-1 text-xs text-espresso focus:border-olive focus:outline-none"
            >
              <option value="raw_founder">Dev-to-Founder (Raw Tech)</option>
              <option value="standard_referral">Standard Professional</option>
              <option value="linkedin_connect">Short LinkedIn Connection</option>
            </select>
            <Button
              variant="outline"
              onClick={generateAIPitch}
              className="!text-[11px] !py-1 !px-2.5"
            >
              Generate
            </Button>
          </div>
        </div>

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
