/* Job-application outreach planner — data model.
   Separate persisted store from the study planner; key "job-application-planner". */

export const STAGES = [
  "lead",
  "to_contact",
  "contacted",
  "replied",
  "interviewing",
  "offer",
  "closed",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  lead: "Lead",
  to_contact: "To contact",
  contacted: "Contacted",
  replied: "Replied",
  interviewing: "Interviewing",
  offer: "Offer",
  closed: "Closed",
};

export const CHANNELS = ["linkedin", "email", "x", "referral", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  linkedin: "LinkedIn",
  email: "Email",
  x: "X",
  referral: "Referral",
  other: "Other",
};

export const PRIORITIES = ["hot", "warm", "cold"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export interface Contact {
  id: string;
  name: string;
  role: string;
  channel: Channel;
  link: string;
  draft: string;
}

export interface Company {
  id: string;

  // Essentials
  name: string;
  role: string;
  stage: Stage;
  notes: string;

  // Outreach (legacy single contact support)
  contactName: string;
  contactRole: string;
  channel: Channel;
  contactLink: string;
  draft: string;

  // Multi-contact tracking
  contacts: Contact[];

  // Tracking
  reachedOutAt?: string; // ISO date — first time the stage reaches "contacted"+
  followUpAt?: string; // ISO date — drives the Action strip
  priority: Priority;
  source: string;

  // Optional extras
  website?: string;
  jobUrl?: string;
  location?: string;
  salary?: string;
  tags: string[];

  // Bookkeeping
  closedReason?: string;
  createdAt: string;
  order: number; // ordering within a stage column
}

export interface Template {
  id: string;
  name: string;
  body: string; // contains {company} {name} {role} placeholders
  order: number;
}

export interface JobsState {
  version: number;
  companies: Company[];
  templates: Template[];
}

export const JOBS_SCHEMA_VERSION = 1;
