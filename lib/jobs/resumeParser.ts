/**
 * Resume Parsing & Match Scoring Engine
 * Extracts candidate skill vectors, experience metrics, and calculates 0-100% Resume Match Scores.
 */

export interface CandidateProfile {
  name: string;
  location: string;
  title: string;
  yearsExperience: number;
  skills: string[];
  metrics: string[];
  targetSalary: string;
  resumeText: string;
  updatedAt: string;
}

export const DEFAULT_CANDIDATE_PROFILE: CandidateProfile = {
  name: "Abhishek Rajput",
  location: "Ahmedabad, Gujarat (Open to Remote / On-Site)",
  title: "AI + Robotics Backend Engineer",
  yearsExperience: 1.5,
  skills: [
    "Django",
    "Python",
    "Celery",
    "Redis",
    "PostgreSQL",
    "Qdrant",
    "RAG",
    "Vector Search",
    "Cross-Encoder",
    "ROS2",
    "RabbitMQ",
    "Prometheus",
    "System Design",
    "REST API",
    "Docker",
  ],
  metrics: [
    "500ms -> 150ms robot latency optimization",
    "60,000 tags/sec Celery async worker queue",
    "1.5s P99 RAG context retrieval pipeline",
    "Zero double charges payment idempotency key ledger",
  ],
  targetSalary: "₹15–20 LPA (India) / $55–70k (Global Remote)",
  resumeText: `Abhishek Rajput — AI & Robotics Backend Engineer (1.5 Yrs Exp)
Specializing in High-Throughput Python Backends (Django, Celery, Redis, PostgreSQL), RAG Systems (Qdrant, HNSW, Cross-Encoder), and Distributed Systems. Reduced robotics latency from 500ms to 150ms and built Celery queues processing 60,000 industrial tags/sec. Target Salary: ₹15-20 LPA / $55-70k.`,
  updatedAt: new Date().toISOString(),
};

export interface ResumeMatchResult {
  score: number; // 0 - 100
  matchingSkills: string[];
  missingSkills: string[];
  matchTier: "Perfect Match" | "High Match" | "Moderate Match" | "Low Match";
  summary: string;
}

/**
 * Calculates a 0-100% match score between candidate resume skills and job description text.
 */
export function computeResumeMatchScore(
  candidateSkills: string[],
  jobTitle: string,
  jobDescription: string
): ResumeMatchResult {
  const combinedText = `${jobTitle} ${jobDescription}`.toLowerCase();
  
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  // Core technical keywords to check
  const ALL_KEYWORDS = [
    "Django",
    "Python",
    "Celery",
    "Redis",
    "Postgres",
    "PostgreSQL",
    "Qdrant",
    "RAG",
    "Vector Search",
    "LLM",
    "ROS2",
    "RabbitMQ",
    "Prometheus",
    "System Design",
    "API",
    "Microservices",
    "Docker",
    "SQL",
    "Async",
  ];

  ALL_KEYWORDS.forEach((kw) => {
    const isPresentInJob = combinedText.includes(kw.toLowerCase());
    const isCandidateSkill = candidateSkills.some(
      (cs) => cs.toLowerCase() === kw.toLowerCase() || (kw === "Postgres" && cs.toLowerCase().includes("postgres"))
    );

    if (isPresentInJob && isCandidateSkill) {
      if (!matchingSkills.includes(kw)) matchingSkills.push(kw);
    } else if (isPresentInJob && !isCandidateSkill) {
      if (!missingSkills.includes(kw)) missingSkills.push(kw);
    }
  });

  // Base score calculation
  const totalKeywords = matchingSkills.length + missingSkills.length;
  let baseScore = totalKeywords > 0 ? Math.round((matchingSkills.length / totalKeywords) * 100) : 75;

  // Title bonus matching
  const titleLower = jobTitle.toLowerCase();
  if (
    titleLower.includes("backend") ||
    titleLower.includes("ai") ||
    titleLower.includes("python") ||
    titleLower.includes("systems") ||
    titleLower.includes("engineer")
  ) {
    baseScore = Math.min(100, baseScore + 15);
  }

  // Ensure minimum baseline for relevant dev jobs
  const finalScore = Math.max(65, Math.min(98, baseScore));

  let matchTier: ResumeMatchResult["matchTier"] = "Moderate Match";
  if (finalScore >= 90) matchTier = "Perfect Match";
  else if (finalScore >= 80) matchTier = "High Match";

  return {
    score: finalScore,
    matchingSkills,
    missingSkills: missingSkills.slice(0, 4),
    matchTier,
    summary: `${matchingSkills.length} matching core skills (${matchingSkills.slice(0, 4).join(", ")})`,
  };
}
