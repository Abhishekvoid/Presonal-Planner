import { Company, JOBS_SCHEMA_VERSION, JobsState, Template } from "./types";

/** Days from today as an ISO date string (date only, local). */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* Two starter templates — genuinely useful, not filler. Editable / deletable. */
const templates: Template[] = [
  {
    id: "tpl-linkedin-intro",
    name: "LinkedIn intro",
    body:
      "Hi {name}, I came across {company} and the work your team is doing really resonates with me. " +
      "I'm a backend engineer moving toward {role} work and would love to learn how you think about it. " +
      "Open to a quick chat?",
    order: 0,
  },
  {
    id: "tpl-follow-up",
    name: "Follow-up nudge",
    body:
      "Hi {name}, following up on my last note about {role} at {company}. " +
      "Totally understand things get busy. Happy to keep it to 10 minutes whenever suits you.",
    order: 1,
  },
];

/* A few sample leads so both views read as alive on first run.
   Tagged "sample" so they're easy to spot and delete. */
const companies: Company[] = [
  {
    id: "co-sample-1",
    name: "Skild AI",
    role: "Backend / Robotics Infra Engineer",
    stage: "lead",
    notes: "Foundation models for robotics. Strong infra needs.",
    contactName: "Priya Nair",
    contactRole: "Eng Manager, Platform",
    channel: "linkedin",
    contactLink: "",
    draft: "",
    contacts: [],
    priority: "hot",
    source: "Saw their Series A announcement",
    website: "",
    jobUrl: "",
    location: "Pittsburgh / Remote",
    salary: "",
    tags: ["sample", "robotics"],
    createdAt: new Date().toISOString(),
    order: 0,
  },
  {
    id: "co-sample-2",
    name: "Physical Intelligence",
    role: "Backend Engineer, Data Platform",
    stage: "contacted",
    notes: "Reached out on LinkedIn, no reply yet.",
    contactName: "Marco Reyes",
    contactRole: "Founding Engineer",
    channel: "linkedin",
    contactLink: "",
    draft: "",
    contacts: [],
    reachedOutAt: isoDaysFromNow(-7),
    followUpAt: isoDaysFromNow(-1),
    priority: "hot",
    source: "Referral hint from ex-colleague",
    website: "",
    jobUrl: "",
    location: "San Francisco",
    salary: "",
    tags: ["sample"],
    createdAt: new Date().toISOString(),
    order: 0,
  },
  {
    id: "co-sample-3",
    name: "Cohere",
    role: "Platform Engineer",
    stage: "replied",
    notes: "Recruiter replied, scheduling a call.",
    contactName: "Jordan Webb",
    contactRole: "Technical Recruiter",
    channel: "email",
    contactLink: "",
    draft: "",
    contacts: [],
    reachedOutAt: isoDaysFromNow(-12),
    followUpAt: isoDaysFromNow(2),
    priority: "warm",
    source: "Careers page",
    website: "",
    jobUrl: "",
    location: "Remote",
    salary: "",
    tags: ["sample"],
    createdAt: new Date().toISOString(),
    order: 0,
  },
];

export function buildJobsSeed(): JobsState {
  return { version: JOBS_SCHEMA_VERSION, companies, templates };
}
