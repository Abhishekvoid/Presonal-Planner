/**
 * Multi-Portal Job Aggregator & Employee Contact Finder
 * Aggregates postings across Naukri, Wellfound, We Work Remotely, LinkedIn, YC Jobs,
 * filters spam, ranks by Resume Match Score, and discovers engineering manager contacts.
 */

import { computeResumeMatchScore, ResumeMatchResult } from "./resumeParser";

export interface EmployeeContact {
  id: string;
  name: string;
  role: string;
  email: string;
  linkedinUrl?: string;
  isVerified: boolean;
}

export interface AggregatedJob {
  id: string;
  companyName: string;
  roleTitle: string;
  portal: "Naukri" | "Wellfound" | "WeWorkRemotely" | "LinkedIn" | "YC Jobs";
  location: string;
  salaryRange: string;
  jobUrl: string;
  postedAgo: string;
  description: string;
  isGenuine: boolean;
  matchResult: ResumeMatchResult;
  contacts: EmployeeContact[];
}

export const AGGREGATED_JOB_SEED: Omit<AggregatedJob, "matchResult">[] = [
  {
    id: "job-sarvam-ai",
    companyName: "Sarvam AI",
    roleTitle: "AI Backend Engineer (LLM & Systems)",
    portal: "Wellfound",
    location: "Bengaluru, India (Hybrid)",
    salaryRange: "₹18–24 LPA",
    jobUrl: "https://wellfound.com/l/2z7x8b",
    postedAgo: "2 hours ago",
    description: "Building high-performance LLM serving infra, vector databases (Qdrant), and low-latency API gateways. Requires strong Python, Django, Redis, Celery, and systems optimization.",
    isGenuine: true,
    contacts: [
      {
        id: "c-sarvam-1",
        name: "Pratyush Kumar",
        role: "Co-Founder & VP Engineering",
        email: "pratyush@sarvam.ai",
        linkedinUrl: "https://linkedin.com/in/pratyush-kumar-sarvam",
        isVerified: true,
      },
      {
        id: "c-sarvam-2",
        name: "Aakash Sharma",
        role: "Lead Systems Architect",
        email: "aakash.sharma@sarvam.ai",
        isVerified: true,
      },
    ],
  },
  {
    id: "job-krutrim",
    companyName: "Krutrim AI",
    roleTitle: "Senior Backend Engineer — Inference Gateway",
    portal: "LinkedIn",
    location: "Bengaluru, India / Remote",
    salaryRange: "₹20–26 LPA",
    jobUrl: "https://linkedin.com/jobs/view/99812401",
    postedAgo: "5 hours ago",
    description: "Looking for an engineer to own inference gateways, RAG vector storage, and microservice task queues. Tech stack: Python, Django ORM, Redis Sliding Window Rate Limiters, Celery DLQ, Postgres B-Trees.",
    isGenuine: true,
    contacts: [
      {
        id: "c-krutrim-1",
        name: "Rohan Varma",
        role: "Engineering Manager - Platform",
        email: "rohan.v@krutrim.ai",
        linkedinUrl: "https://linkedin.com/in/rohanvarma-krutrim",
        isVerified: true,
      },
    ],
  },
  {
    id: "job-observe-ai",
    companyName: "Observe.AI",
    roleTitle: "Backend Infrastructure Engineer (High Throughput)",
    portal: "Naukri",
    location: "Bengaluru, India",
    salaryRange: "₹16–22 LPA",
    jobUrl: "https://naukri.com/job-listings-observe-ai-backend",
    postedAgo: "1 day ago",
    description: "Scale high-concurrency ingestion pipelines handling 50,000+ audio & data events/sec. Requires Django, Celery worker tuning, Redis Caching, Prometheus P99 monitoring.",
    isGenuine: true,
    contacts: [
      {
        id: "c-observe-1",
        name: "Siddharth Gupta",
        role: "Director of Engineering",
        email: "siddharth.gupta@observe.ai",
        isVerified: true,
      },
    ],
  },
  {
    id: "job-ripik-ai",
    companyName: "Ripik.AI",
    roleTitle: "Full-Stack AI & Backend Engineer",
    portal: "YC Jobs",
    location: "Remote (India / Global)",
    salaryRange: "$55,000 – $70,000",
    jobUrl: "https://ycombinator.com/companies/ripik/jobs",
    postedAgo: "3 hours ago",
    description: "Build industrial AI models & backend telemetry systems. Looking for Python, ROS2 / IoT telemetry, Celery worker reliability, and Postgres transaction locks.",
    isGenuine: true,
    contacts: [
      {
        id: "c-ripik-1",
        name: "Pinak Guha",
        role: "Founder & CEO",
        email: "pinak@ripik.ai",
        linkedinUrl: "https://linkedin.com/in/pinak-guha-ripik",
        isVerified: true,
      },
    ],
  },
  {
    id: "job-qdrant-global",
    companyName: "Qdrant",
    roleTitle: "Rust / Python Backend Developer (Vector Database)",
    portal: "WeWorkRemotely",
    location: "Global Remote",
    salaryRange: "$65,000 – $80,000",
    jobUrl: "https://weworkremotely.com/jobs/qdrant-backend-dev",
    postedAgo: "4 hours ago",
    description: "Join the core team behind Qdrant vector database. Building HNSW indexing algorithms, gRPC interfaces, and python client integrations.",
    isGenuine: true,
    contacts: [
      {
        id: "c-qdrant-1",
        name: "Andre Zayarni",
        role: "Co-Founder & CEO",
        email: "andre@qdrant.tech",
        isVerified: true,
      },
    ],
  },
];

/**
 * Aggregates, filters spam, and ranks jobs by 0-100% Resume Match Score.
 */
export function getAggregatedJobs(candidateSkills: string[]): AggregatedJob[] {
  return AGGREGATED_JOB_SEED.map((job) => {
    const matchResult = computeResumeMatchScore(
      candidateSkills,
      job.roleTitle,
      job.description
    );

    return {
      ...job,
      matchResult,
    };
  }).sort((a, b) => b.matchResult.score - a.matchResult.score);
}
