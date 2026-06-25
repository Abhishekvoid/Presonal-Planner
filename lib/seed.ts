import {
  Day,
  DEFAULT_FOCUS_SETTINGS,
  Difficulty,
  PlannerState,
  SCHEMA_VERSION,
  Task,
  Track,
} from "./types";

/** Track definitions — accents stay inside the warm cream/coffee/olive palette. */
const TRACKS: { key: SectionKey; name: string; tag: string; accent: string }[] = [
  { key: "dsa", name: "DSA", tag: "DSA", accent: "var(--olive)" },
  { key: "django", name: "Django / backend", tag: "BACKEND", accent: "var(--coffee)" },
  { key: "sys", name: "System design", tag: "SYSTEM", accent: "var(--espresso)" },
  { key: "interview", name: "Interview", tag: "INTERVIEW", accent: "var(--clay)" },
];

type SectionKey = "dsa" | "django" | "sys" | "interview";

interface RawItem {
  t: string;
  d?: "e" | "m" | "h";
  tip?: string;
}

interface RawDay {
  n: number;
  title: string;
  date: string;
  goal: string;
  must: string;
  result: string;
  dsa?: RawItem[];
  django?: RawItem[];
  sys?: RawItem[];
  interview?: RawItem[];
}

const DIFF: Record<string, Difficulty> = { e: "easy", m: "med", h: "hard" };

// Ported verbatim from 10day_complete_daily_plan.html
const RAW_DAYS: RawDay[] = [
  {
    n: 1,
    title: "Django ORM + Query Optimization",
    date: "Jun 5",
    goal: "By night: answer 'Your query is slow — debug and fix it' without hesitation.",
    must: "Build Customer → Orders → OrderItems → Product. Create N+1 intentionally. Fix it. Explain select_related and prefetch_related cold.",
    result: "Open a blank file. Write a Django queryset with select_related, annotate+Count, Q filter, F expression — from memory in under 5 min. If you can't, you're not done.",
    dsa: [
      { t: "Two Sum (LC #1)", d: "e", tip: "HashMap: value → index. One pass." },
      { t: "Move Zeroes (LC #283)", d: "e", tip: "Two pointer: slow tracks insertion point." },
      { t: "3Sum (LC #15)", d: "m", tip: "Sort + two pointer. Skip duplicates carefully." },
    ],
    django: [
      { t: "select_related() — SQL JOIN, use for ForeignKey / OneToOne" },
      { t: "prefetch_related() — separate query, use for ManyToMany / reverse FK" },
      { t: "annotate() — add computed field per row (Count, Sum, Avg)" },
      { t: "aggregate() — single value across entire queryset" },
      { t: "F() — reference field value in DB without pulling to Python" },
      { t: "Q() — complex OR / AND / NOT filters" },
      { t: "exists() — faster than count() > 0 for boolean check" },
      { t: "only() / defer() — fetch subset of columns" },
      { t: "N+1 problem — what it is, how django-debug-toolbar shows it" },
      { t: "values() vs values_list() — when each helps" },
    ],
    sys: [
      { t: "Draw: App → Django ORM → SQL → Postgres → result (label the N+1 path vs fixed path)" },
      { t: "Explain out loud: select_related vs prefetch_related — when each fires, what SQL each produces" },
    ],
    interview: [
      { t: "Difference between select_related and prefetch_related?" },
      { t: "When does select_related become bad? (ManyToMany — it multiplies rows)" },
      { t: "What is N+1? Give a real example." },
      { t: "What does annotate do vs aggregate?" },
      { t: "Give me a real use case for F expression." },
      { t: "Give me a real use case for Q object." },
    ],
  },
  {
    n: 2,
    title: "PostgreSQL — indexes, EXPLAIN, transactions",
    date: "Jun 6",
    goal: "By night: answer 'Why is your database slow?' with a specific, structured answer.",
    must: "Create the Payment table. Write the query WHERE user_id=? AND status=?. Run EXPLAIN ANALYZE before and after adding a composite index. Show the difference.",
    result: "Draw on paper: App → Postgres → Index → faster query. Explain ACID, deadlock, and composite index ordering cold in 3 min.",
    dsa: [
      { t: "Binary Search (LC #704)", d: "e", tip: "left, right, mid=(l+r)//2. Off-by-one kills you." },
      { t: "Search Insert Position (LC #35)", d: "e", tip: "Binary search — return left at the end." },
      { t: "Search in Rotated Sorted Array (LC #33)", d: "m", tip: "Determine which half is sorted, then binary search that half." },
    ],
    django: [
      { t: "B-Tree index — default, good for equality + range queries" },
      { t: "Composite index — column order matters (most selective first)" },
      { t: "Unique index — enforces uniqueness at DB level" },
      { t: "EXPLAIN — shows query plan (no execution)" },
      { t: "EXPLAIN ANALYZE — executes + shows actual time and rows" },
      { t: "Seq Scan vs Index Scan — what each means in the output" },
      { t: "ACID: Atomicity, Consistency, Isolation, Durability — define each" },
      { t: "Isolation levels: Read Committed, Repeatable Read, Serializable" },
      { t: "Deadlock — what causes it, how Postgres resolves it" },
      { t: "Transaction rollback — when and how" },
    ],
    sys: [
      { t: "Draw: App → Postgres → Index → Faster Query (with seq scan vs index scan paths labeled)" },
      { t: "Draw: ACID diagram — what breaks if each property is missing" },
    ],
    interview: [
      { t: "What is a database index? What data structure does Postgres use?" },
      { t: "Composite index — does order of columns matter? Why?" },
      { t: "What is ACID? Which property prevents dirty reads?" },
      { t: "What is a deadlock? How does Postgres handle it?" },
      { t: "When would you NOT add an index?" },
      { t: "Difference between EXPLAIN and EXPLAIN ANALYZE?" },
    ],
  },
  {
    n: 3,
    title: "Redis — caching, rate limiting, patterns",
    date: "Jun 7",
    goal: "By night: answer 'Why use Redis instead of PostgreSQL for this?' with a concrete, specific answer.",
    must: "Cache a user profile with SETEX. Measure cache miss vs cache hit latency. Implement a rate limiter with sliding window in Redis (ZADD + ZREMRANGEBYSCORE + ZCARD).",
    result: "Design on paper: Request → Redis (hit → return) / (miss → DB → cache → return). Explain cache invalidation strategies. Write the rate limiter from memory.",
    dsa: [
      { t: "Longest Substring Without Repeating (LC #3)", d: "m", tip: "Sliding window + set. Expand right, shrink left when duplicate found." },
      { t: "Permutation in String (LC #567)", d: "m", tip: "Fixed-size window, Counter comparison." },
      { t: "Minimum Size Subarray Sum (LC #209)", d: "m", tip: "Variable sliding window — shrink from left when sum >= target." },
    ],
    django: [
      { t: "Cache Aside pattern — check cache first, on miss load DB, store in cache" },
      { t: "Write Through pattern — write to DB and cache simultaneously" },
      { t: "Redis commands: GET, SET, SETEX, DEL, INCR, EXPIRE" },
      { t: "Redis data types: string, hash, list, set, sorted set — when each" },
      { t: "Cache invalidation strategies — TTL, event-based, manual" },
      { t: "Rate limiting with Token Bucket — concept and implementation" },
      { t: "Rate limiting with Sliding Window — ZADD timestamp, ZREMRANGEBYSCORE, ZCARD" },
      { t: "Redis as Django cache backend — django-redis setup in settings.py" },
      { t: "Cache key design — namespacing, hash keys, TTL strategy" },
      { t: "Redis persistence: RDB vs AOF — tradeoffs" },
    ],
    sys: [
      { t: "Draw: Request → Redis hit → return / Redis miss → DB → cache → return (label TTL)" },
      { t: "Draw: Sliding window rate limiter — sorted set, timestamp as score, window cleanup" },
    ],
    interview: [
      { t: "Redis vs PostgreSQL — when do you choose Redis?" },
      { t: "Why cache? What problems does it solve?" },
      { t: "Cache invalidation — what are the strategies? Which is hardest?" },
      { t: "How does your rate limiter work? What happens at window boundary?" },
      { t: "What is cache stampede? How do you prevent it?" },
      { t: "What happens when Redis runs out of memory?" },
    ],
  },
  {
    n: 4,
    title: "Celery — async tasks, queues, reliability",
    date: "Jun 8",
    goal: "By night: answer 'Why not just do it synchronously?' with a real architecture explanation.",
    must: "Build: User registers → Django view → Celery task → send email. Add retry. Kill the worker mid-task. Confirm it re-queues. Draw full architecture from memory.",
    result: "Draw the full Celery architecture cold: broker, worker, result backend, beat, Flower — labeled. Explain what happens when the worker dies mid-task.",
    dsa: [
      { t: "Number of Islands (LC #200)", d: "m", tip: "BFS or DFS on grid. Mark visited in-place as '0'." },
      { t: "Clone Graph (LC #133)", d: "m", tip: "BFS + hashmap: old node → new node." },
      { t: "Course Schedule (LC #207)", d: "m", tip: "DFS cycle detection on directed graph. 3-state visited." },
    ],
    django: [
      { t: "@shared_task — task defined without binding to a specific app" },
      { t: "bind=True — gives self access to retry, request metadata" },
      { t: "self.retry(exc, countdown, max_retries) — retry with delay" },
      { t: "countdown vs eta — relative vs absolute delay" },
      { t: "Task routing — CELERY_TASK_ROUTES, named queues (fast/slow)" },
      { t: "Task idempotency — what it means, how to implement with a DB flag" },
      { t: "Dead Letter Queue (DLQ) concept — where failed tasks go" },
      { t: "CELERY_TASK_ACKS_LATE=True — only ack after task completes" },
      { t: "CELERY_WORKER_PREFETCH_MULTIPLIER=1 — don't grab multiple tasks" },
      { t: "Flower dashboard — monitor tasks, workers, queues live" },
    ],
    sys: [
      { t: "Draw full Celery architecture: Django → broker (Redis) → worker → result backend → beat" },
      { t: "Draw: what happens when worker dies mid-task (ACKS_LATE + REJECT_ON_LOST)" },
    ],
    interview: [
      { t: "What if the worker dies mid-task? How do you recover?" },
      { t: "What if Redis (broker) dies? What happens to queued tasks?" },
      { t: "What if a task runs twice? How do you ensure idempotency?" },
      { t: "What is a Dead Letter Queue? When would you use it?" },
      { t: "How do you prioritise tasks? (separate queues)" },
      { t: "What is the difference between countdown and eta?" },
    ],
  },
  {
    n: 5,
    title: "Payment system design",
    date: "Jun 9",
    goal: "By night: explain a payment system design confidently for 20 minutes without notes.",
    must: "Design Razorpay-style payment flow end to end. Handle: duplicate payment, gateway timeout, webhook failure, DB failure after payment success. Draw it all.",
    result: "20-minute recorded explanation. User → API → DB → Gateway → Webhook Queue → Merchant. Every failure mode covered with a specific solution.",
    dsa: [
      { t: "Top K Frequent Elements (LC #347)", d: "m", tip: "Counter + heapq.nlargest. Or bucket sort." },
      { t: "Course Schedule II (LC #210)", d: "m", tip: "Topological sort — BFS Kahn's algorithm." },
      { t: "Task Scheduler (LC #621)", d: "m", tip: "Heap + greedy. Most frequent task first." },
    ],
    django: [
      { t: "Idempotency key — unique key per request, check before processing" },
      { t: "Retry pattern — exponential backoff, max retries, jitter" },
      { t: "Webhook delivery — at-least-once, retry on failure, signature verify" },
      { t: "Dead Letter Queue — failed webhooks after N retries" },
      { t: "Circuit Breaker — fail fast when downstream is down (tenacity library)" },
      { t: "Optimistic locking — prevent double-spend with version field" },
      { t: "DB transaction for payment — atomic() wrapper" },
      { t: "Payment state machine: CREATED → PENDING → SUCCESS/FAILED/REFUNDED" },
      { t: "Outbox pattern — write to DB and queue in same transaction" },
    ],
    sys: [
      { t: "Draw: User → API → DB → Gateway → Webhook Queue → Merchant (full flow)" },
      { t: "Draw: idempotency key flow — first request vs retry (what differs)" },
      { t: "Draw: circuit breaker states — closed, open, half-open" },
    ],
    interview: [
      { t: "How do you prevent a duplicate payment?" },
      { t: "Gateway times out — payment may or may not have gone through. What do you do?" },
      { t: "Merchant webhook is slow and keeps failing. How do you handle?" },
      { t: "Payment succeeded at gateway but your DB write failed. Now what?" },
      { t: "How do you test a payment system without charging real cards?" },
      { t: "What is an outbox pattern and why is it useful here?" },
    ],
  },
  {
    n: 6,
    title: "Your RAG project — make it your weapon",
    date: "Jun 10",
    goal: "By night: explain your RAG project for 4 minutes confidently with no notes — every decision justified with a number.",
    must: "Record yourself explaining the project. Play it back. Every vague word ('basically', 'kind of') = a gap. Fix and re-record until it's clean.",
    result: "4-minute explanation covering: architecture, why Qdrant, why cross-encoder, why Celery, query optimization pipeline, latency (1.5s), how you'd scale it to 10k users.",
    dsa: [
      { t: "Pacific Atlantic Water Flow (LC #417)", d: "m", tip: "BFS from both coasts inward. Find intersection." },
      { t: "Word Ladder (LC #127)", d: "h", tip: "BFS, each word is a node. Level = steps." },
    ],
    django: [
      { t: "Why Qdrant over pgvector or Pinecone — trade-offs you actually evaluated" },
      { t: "Why TEI (Text Embeddings Inference) — self-hosted vs API cost trade-off" },
      { t: "Why cross-encoder reranker — what it improved (measure it)" },
      { t: "Why semantic chunking — what breaks with fixed-size chunking" },
      { t: "Why intent routing — what it prevents" },
      { t: "Why Celery for ingestion — what breaks without it" },
      { t: "Scaling to 10k users — what breaks first, how you fix each" },
      { t: "Cost optimization — what costs money, how you reduce it" },
      { t: "Ragas eval — what metrics you track and what your current scores are" },
      { t: "What you would change if rebuilding — show you can critique your own work" },
    ],
    sys: [
      { t: "Draw your RAG pipeline end to end: upload → OCR → chunk → embed → Qdrant → rerank → LLM → answer" },
      { t: "Draw the query optimization pipeline: contextualize → route → expand → retrieve" },
    ],
    interview: [
      { t: "Why did you choose Qdrant? Have you tried pgvector?" },
      { t: "What is cross-encoder reranking and did it actually help?" },
      { t: "How do you measure if your RAG answers are correct?" },
      { t: "How would you reduce the 1.5s latency to under 800ms?" },
      { t: "What breaks first if 10,000 users hit it simultaneously?" },
      { t: "What would you build differently if you started today?" },
    ],
  },
  {
    n: 7,
    title: "System design foundations — notification system",
    date: "Jun 11",
    goal: "By night: design a notification system (email + SMS) in 15 minutes without notes.",
    must: "Build the notification system design on paper. Then explain it out loud, recorded. Cover: why queue, why cache, why read replica, failure handling.",
    result: "15-min whiteboard-style explanation: User action → Event → Queue → Workers → Email/SMS providers → Delivery tracking. Every component justified.",
    dsa: [
      { t: "Merge Intervals (LC #56)", d: "m", tip: "Sort by start. Merge if current start <= prev end." },
      { t: "Meeting Rooms II (LC #253)", d: "m", tip: "Min-heap of end times. Size = rooms needed." },
      { t: "Non-overlapping Intervals (LC #435)", d: "m", tip: "Greedy: sort by end, keep earliest-ending intervals." },
    ],
    django: [
      { t: "Load Balancer — distributes requests, health checks, session affinity" },
      { t: "Read Replica — offload read queries, eventual consistency trade-off" },
      { t: "Message Queue — decouples producer/consumer, handles spikes" },
      { t: "Fan-out pattern — one event triggers multiple workers" },
      { t: "Notification deduplication — idempotency key per notification" },
      { t: "Provider failover — primary SMS fails → secondary provider" },
      { t: "Delivery tracking — SENT / DELIVERED / FAILED states" },
      { t: "Rate limiting per user — don't spam users" },
      { t: "Template rendering — separate service, cacheable" },
    ],
    sys: [
      { t: "Draw: User action → Event → Queue → Email Worker + SMS Worker → Providers → Tracking DB" },
      { t: "Draw: Fan-out pattern — one event, multiple notification types" },
      { t: "Draw: Provider failover — what triggers it, how it switches" },
    ],
    interview: [
      { t: "Why use a queue instead of calling the provider directly?" },
      { t: "Why a read replica? What breaks with eventual consistency?" },
      { t: "How do you prevent sending duplicate notifications?" },
      { t: "Primary email provider is down. How do you failover?" },
      { t: "How do you scale to 10 million notifications per day?" },
      { t: "How do you track delivery and handle bounces?" },
    ],
  },
  {
    n: 8,
    title: "Monitoring, production debugging, LLM gateway",
    date: "Jun 12",
    goal: "By night: answer 'Production is down. What do you check?' with a structured, confident runbook.",
    must: "Add Prometheus metrics to your project: one counter, one histogram, one gauge. Build a semantic cache middleware. Know your debug order cold.",
    result: "Write your production debug runbook from memory: order of checks, what each metric tells you, how you isolate the problem.",
    dsa: [
      { t: "Find Median from Data Stream (LC #295)", d: "h", tip: "Two heaps: max-heap left half, min-heap right half." },
      { t: "Sliding Window Maximum (LC #239)", d: "h", tip: "Monotonic deque. Max always at front." },
      { t: "LRU Cache (LC #146)", d: "m", tip: "OrderedDict: get = move_to_end, put = move_to_end + popitem if over capacity." },
    ],
    django: [
      { t: "Prometheus Counter — monotonically increasing (requests, errors)" },
      { t: "Prometheus Gauge — can go up/down (queue depth, active connections)" },
      { t: "Prometheus Histogram — distribution (latency buckets p50/p95/p99)" },
      { t: "p50 / p95 / p99 latency — what they mean, why p99 matters" },
      { t: "Structured logging with structlog — JSON logs, bind context per request" },
      { t: "Sentry for error tracking — capture_exception, breadcrumbs" },
      { t: "Debug order: logs → error rate → latency → queue depth → DB connections → memory" },
      { t: "LLM gateway: semantic cache (Redis cosine lookup) → model router → fallback chain" },
      { t: "Semantic cache: embed query → SHA256 key → cosine threshold 0.92 → return or call LLM" },
      { t: "Model fallback chain: GPT-4o timeout → GPT-4o-mini → cached response" },
    ],
    sys: [
      { t: "Draw: LLM gateway — request → semantic cache → model router → LLM → cache write → response" },
      { t: "Draw: production debug flow — where you look first, second, third" },
    ],
    interview: [
      { t: "Production is down. Walk me through exactly what you check and in what order." },
      { t: "What is the difference between p95 and p99 latency? When does each matter?" },
      { t: "How do you implement a semantic cache? What threshold do you use for similarity?" },
      { t: "Your LLM API is rate limited. How do you handle it gracefully?" },
      { t: "How do you add observability without slowing down the request path?" },
      { t: "Queue depth is 10,000 and growing. What do you do?" },
    ],
  },
  {
    n: 9,
    title: "Mock interview day — find your gaps",
    date: "Jun 13",
    goal: "By night: know exactly which topics you own and which need one more day.",
    must: "Morning: code all 4 DSA problems timed. Afternoon: answer all 6 Django/DB/Redis/Celery questions out loud. Night: design payment system AND notification system back to back without notes.",
    result: "A list of 3 specific gaps you found. Those become your focus on day 10 morning before you apply.",
    dsa: [
      { t: "Two Sum (LC #1) — timed, 4 min max", d: "e", tip: "You've done this. Should be automatic now." },
      { t: "Binary Search (LC #704) — timed, 4 min max", d: "e", tip: "Clean implementation, handle edge cases." },
      { t: "Number of Islands (LC #200) — timed, 12 min max", d: "m", tip: "BFS or DFS — pick one and be consistent." },
      { t: "Top K Frequent Elements (LC #347) — timed, 10 min max", d: "m", tip: "Counter + heap. Should be smooth now." },
    ],
    django: [
      { t: "Explain Django ORM: select_related, prefetch_related, annotate, F, Q — 3 min" },
      { t: "Explain PostgreSQL indexes: composite index, EXPLAIN ANALYZE — 3 min" },
      { t: "Explain Redis cache patterns + rate limiting — 3 min" },
      { t: "Explain Celery architecture: what happens when worker dies — 3 min" },
      { t: "Explain your RAG project: architecture, decisions, numbers — 4 min" },
      { t: "System design: notification system — 15 min" },
    ],
    sys: [
      { t: "Payment system: draw + explain end to end — 20 min, no notes" },
      { t: "Notification system: draw + explain end to end — 15 min, no notes" },
      { t: "RAG system: draw + explain end to end — 15 min, no notes" },
    ],
    interview: [
      { t: "After mock: write down exactly 3 things you could not explain cleanly" },
      { t: "After mock: write down which DSA problem took longer than target time" },
      { t: "After mock: write down which system design had gaps" },
    ],
  },
  {
    n: 10,
    title: "Apply — no learning, only action",
    date: "Jun 14",
    goal: "By night: 10 startups contacted, 10 product companies applied to. The plan is done. The only remaining step is sending.",
    must: "Fix the 3 gaps from day 9 in the morning (2 hours max). Then apply for the rest of the day. No new topics. No tutorials. No perfecting the resume. Apply.",
    result: "Google Sheet with 20 rows filled: Company | Contact | Email / Application link | Date Sent | Status. That is the only success metric today.",
    dsa: [
      { t: "Review: any problem you got wrong this week — redo it clean, once" },
    ],
    django: [
      { t: "Fix the 3 gaps from yesterday's mock — 2 hours max" },
      { t: "Final resume check: RAG project is first, numbers are in every bullet" },
      { t: "LinkedIn headline updated: AI + Robotics Backend Engineer — Django, Celery, Redis, RAG, ROS2" },
    ],
    sys: [
      { t: "Wellfound profile: create / update — apply to 10 AI startups in one session" },
      { t: "workatastartup.com profile: create / update — mark open to remote" },
      { t: "HN Who's Hiring: search Django, RAG, Python remote — apply to 5 posts directly" },
    ],
    interview: [
      { t: "Sarvam AI — careers.sarvam.ai or cold email CTO (Hunter.io for email)" },
      { t: "Trace Labs — HN April 2026 post, email founder directly" },
      { t: "5 YC AI startups from workatastartup.com — one session, 30 min" },
      { t: "3 startups on Wellfound India AI filter" },
      { t: "Cutshort.io — search 'AI backend engineer' — apply to top 5" },
    ],
  },
];

export function buildSeed(): PlannerState {
  const tracks: Track[] = TRACKS.map((t, i) => ({
    id: `track-${t.key}`,
    name: t.name,
    tag: t.tag,
    accent: t.accent,
    order: i,
  }));

  const days: Day[] = [];
  const tasks: Task[] = [];

  RAW_DAYS.forEach((rd, di) => {
    const dayId = `day-${rd.n}`;
    days.push({
      id: dayId,
      index: rd.n,
      date: rd.date,
      title: rd.title,
      goal: rd.goal,
      must: rd.must,
      result: rd.result,
      order: di,
    });

    (Object.keys(SECTION_TO_TRACK) as SectionKey[]).forEach((section) => {
      const items = rd[section];
      if (!items) return;
      const trackId = SECTION_TO_TRACK[section];
      items.forEach((item, ii) => {
        tasks.push({
          id: `task-${rd.n}-${section}-${ii}`,
          trackId,
          dayId,
          text: item.t,
          difficulty: item.d ? DIFF[item.d] : undefined,
          tip: item.tip,
          done: false,
          order: ii,
        });
      });
    });
  });

  return {
    version: SCHEMA_VERSION,
    tracks,
    days,
    tasks,
    sessions: [],
    reflections: [],
    focusSettings: { ...DEFAULT_FOCUS_SETTINGS },
    activeTimer: null,
  };
}

const SECTION_TO_TRACK: Record<SectionKey, string> = {
  dsa: "track-dsa",
  django: "track-django",
  sys: "track-sys",
  interview: "track-interview",
};
