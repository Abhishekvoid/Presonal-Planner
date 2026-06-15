import { Channel, Company, Priority, Stage, STAGES } from "./types";

/** Days a contacted lead can sit with no reply before it's "no reply yet". */
export const NO_REPLY_DAYS = 5;

/** Parse an ISO date (date-only) to a local midnight Date, or null. */
function toDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length > 10 ? iso.slice(0, 10) : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole-day difference (a - b), ignoring time of day. */
function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / 86_400_000);
}

export interface ActionBuckets {
  dueFollowUp: Company[]; // followUpAt <= today, not closed/offer
  noReply: Company[]; // contacted, reachedOutAt older than NO_REPLY_DAYS
  notContacted: Company[]; // lead or to_contact
}

/**
 * The three Action-strip buckets. `today` is injected for testability and
 * timezone stability; callers pass `new Date()`.
 */
export function actionBuckets(companies: Company[], today: Date): ActionBuckets {
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const dueFollowUp: Company[] = [];
  const noReply: Company[] = [];
  const notContacted: Company[] = [];

  for (const c of companies) {
    if (c.stage === "lead" || c.stage === "to_contact") {
      notContacted.push(c);
    }

    const follow = toDate(c.followUpAt);
    if (
      follow &&
      c.stage !== "closed" &&
      c.stage !== "offer" &&
      daysBetween(todayMidnight, follow) >= 0 // due today or overdue
    ) {
      dueFollowUp.push(c);
    }

    if (c.stage === "contacted") {
      const reached = toDate(c.reachedOutAt);
      if (reached && daysBetween(todayMidnight, reached) >= NO_REPLY_DAYS) {
        noReply.push(c);
      }
    }
  }

  return { dueFollowUp, noReply, notContacted };
}

/** Is this company's follow-up date today or in the past (and still open)? */
export function isFollowUpOverdue(c: Company, today: Date): boolean {
  const follow = toDate(c.followUpAt);
  if (!follow || c.stage === "closed" || c.stage === "offer") return false;
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return daysBetween(todayMidnight, follow) >= 0;
}

/** Companies grouped by stage, in canonical stage order, each sorted by order. */
export function companiesByStage(companies: Company[]): Record<Stage, Company[]> {
  const out = {} as Record<Stage, Company[]>;
  for (const s of STAGES) out[s] = [];
  for (const c of companies) (out[c.stage] ??= []).push(c);
  for (const s of STAGES) out[s].sort((a, b) => a.order - b.order);
  return out;
}

export interface CompanyFilter {
  stage?: Stage | "all";
  priority?: Priority | "all";
  channel?: Channel | "all";
  search?: string;
}

/** Apply the list-view filters + free-text search over name/role/contact/tags. */
export function filterCompanies(
  companies: Company[],
  filter: CompanyFilter,
): Company[] {
  const q = filter.search?.trim().toLowerCase() ?? "";
  return companies.filter((c) => {
    if (filter.stage && filter.stage !== "all" && c.stage !== filter.stage) return false;
    if (filter.priority && filter.priority !== "all" && c.priority !== filter.priority)
      return false;
    if (filter.channel && filter.channel !== "all" && c.channel !== filter.channel)
      return false;
    if (q) {
      const hay = [c.name, c.role, c.contactName, c.contactRole, ...c.tags]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
