export interface Subtopic8020 {
  id: string;
  title: string;
  isHighRoi: boolean;
  description: string;
  practiceDrill: string;
  done: boolean;
}

export interface DsaProblemItem {
  title: string;
  difficulty: "easy" | "med" | "hard";
  tip: string;
}

export interface Topic8020Plan {
  topicId: string;
  topicTitle: string;
  sprintDay: number;
  subtopics: Subtopic8020[];
  dsaProblems: DsaProblemItem[];
  whatToSkip: string[];
}

export const DEFAULT_8020_PLANS: Record<string, Topic8020Plan> = {
  "day-1-django-orm": {
    topicId: "day-1-django-orm",
    topicTitle: "Django ORM & N+1 Optimization",
    sprintDay: 1,
    subtopics: [
      {
        id: "d1-1",
        title: "select_related (SQL JOIN) vs prefetch_related (Python 2nd Query)",
        isHighRoi: true,
        description: "Master when to use SQL INNER/LEFT JOIN vs separate IN query for M2M/Reverse FKs.",
        practiceDrill: "Write ORM query fetching 1,000 orders + authors; measure 1001 queries vs 2 queries.",
        done: false,
      },
      {
        id: "d1-2",
        title: "annotate() SQL aggregation vs Python list iteration",
        isHighRoi: true,
        description: "Push SUM, COUNT, AVG computations directly into Postgres engine.",
        practiceDrill: "Replace Python for-loop total cost calculation with `.annotate(total=Sum('price'))`.",
        done: false,
      },
      {
        id: "d1-3",
        title: "F() expressions & Atomic Race Condition Prevention",
        isHighRoi: true,
        description: "Perform database-level updates without fetching model instances into Python memory.",
        practiceDrill: "Implement atomic inventory decrement: `Product.objects.filter(id=x).update(stock=F('stock') - 1)`.",
        done: false,
      },
      {
        id: "d1-4",
        title: "Q() objects & Complex Boolean SQL Filters",
        isHighRoi: true,
        description: "Construct dynamic AND/OR/NOT SQL WHERE clauses cleanly.",
        practiceDrill: "Build search query matching `(status='active' AND price < 100) OR (featured=True)`.",
        done: false,
      },
      {
        id: "d1-5",
        title: "N+1 Query Detection & django-debug-toolbar Profiling",
        isHighRoi: true,
        description: "Identify and eliminate hidden duplicate DB queries in API serializers.",
        practiceDrill: "Run API endpoint profiler to verify zero duplicate queries on 500 nested records.",
        done: false,
      },
    ],
    dsaProblems: [
      { title: "Two Sum (LC #1)", difficulty: "easy", tip: "HashMap: value → index. One pass O(N)." },
      { title: "Move Zeroes (LC #283)", difficulty: "easy", tip: "Two pointer: slow tracks insertion point." },
      { title: "3Sum (LC #15)", difficulty: "med", tip: "Sort + two pointer. Skip duplicates carefully." },
    ],
    whatToSkip: [
      "Obscure third-party ORM mixins",
      "Manual SQL string interpolation (always use params to prevent SQL injection)",
      "Legacy Django 1.x query methods",
    ],
  },
  "day-2-postgres-indexing": {
    topicId: "day-2-postgres-indexing",
    topicTitle: "PostgreSQL Indexing & EXPLAIN ANALYZE",
    sprintDay: 2,
    subtopics: [
      {
        id: "d2-1",
        title: "B-Tree Indexes vs LSM-Trees (Read-heavy vs Write-heavy)",
        isHighRoi: true,
        description: "Understand internal tree depth, page splits, and search complexity O(log N).",
        practiceDrill: "Explain why B-Trees excel for equality/range queries while LSM-Trees optimize write throughput.",
        done: false,
      },
      {
        id: "d2-2",
        title: "Composite Index Ordering Rules (Leftmost Prefix Rule)",
        isHighRoi: true,
        description: "Order index columns by high cardinality and WHERE clause sequence.",
        practiceDrill: "Design composite index `(tenant_id, created_at, status)` for multi-tenant query filter.",
        done: false,
      },
      {
        id: "d2-3",
        title: "EXPLAIN (ANALYZE, BUFFERS) Execution Plan Reading",
        isHighRoi: true,
        description: "Identify Seq Scan vs Index Scan, Bitmap Heap Scan, and disk spill buffer hits.",
        practiceDrill: "Run EXPLAIN ANALYZE on a 1,000,000 row table query; fix a Sequential Scan.",
        done: false,
      },
      {
        id: "d2-4",
        title: "ACID Guarantees & Write-Ahead Logging (WAL)",
        isHighRoi: true,
        description: "How PostgreSQL ensures durability and crash recovery using WAL buffers.",
        practiceDrill: "Trace transaction commit flow from shared buffers -> WAL -> disk sync.",
        done: false,
      },
      {
        id: "d2-5",
        title: "Isolation Levels & Deadlock Resolution",
        isHighRoi: true,
        description: "Read Committed vs Repeatable Read vs Serializable; handling row-level locks.",
        practiceDrill: "Simulate a 2-transaction deadlock scenario in psql terminal and resolve with `SELECT FOR UPDATE NOWAIT`.",
        done: false,
      },
    ],
    dsaProblems: [
      { title: "Binary Search (LC #704)", difficulty: "easy", tip: "left, right, mid=(l+r)//2. Off-by-one check." },
      { title: "Search Insert Position (LC #35)", difficulty: "easy", tip: "Binary search — return left at the end." },
      { title: "Search in Rotated Sorted Array (LC #33)", difficulty: "med", tip: "Determine which half is sorted, binary search." },
    ],
    whatToSkip: [
      "Manual C-extension Postgres plugin development",
      "Obscure spatial R-Tree algorithms (focus on B-Tree and GIN)",
    ],
  },
  "day-3-redis-rate-limiter": {
    topicId: "day-3-redis-rate-limiter",
    topicTitle: "Redis Cache Aside & Rate Limiters",
    sprintDay: 3,
    subtopics: [
      {
        id: "d3-1",
        title: "Cache Aside vs Write Through vs Write Back Patterns",
        isHighRoi: true,
        description: "Master cache invalidation strategies and cache stampede (thundering herd) mitigation.",
        practiceDrill: "Implement Cache Aside in Python: Check Redis -> DB Fallback -> Set Cache with SETEX TTL.",
        done: false,
      },
      {
        id: "d3-2",
        title: "Sliding Window Rate Limiter using Redis Sorted Sets (ZADD)",
        isHighRoi: true,
        description: "Accurate rolling window rate limiting handling bursts without boundary spikes.",
        practiceDrill: "Write Redis ZADD + ZREMRANGEBYSCORE sliding window rate limiter function in Python.",
        done: false,
      },
      {
        id: "d3-3",
        title: "Token Bucket Rate Limiter Lua Script",
        isHighRoi: true,
        description: "Atomic rate limiting using Lua scripts executed natively inside Redis engine.",
        practiceDrill: "Execute atomic Lua script replenishing tokens and checking limit in < 1ms.",
        done: false,
      },
      {
        id: "d3-4",
        title: "Redis Eviction Policies (LRU, LFU, Volatile-TTL)",
        isHighRoi: true,
        description: "Configure Redis memory management when maxmemory threshold is hit.",
        practiceDrill: "Explain trade-offs between allkeys-lru vs volatile-lfu for API caching.",
        done: false,
      },
    ],
    dsaProblems: [
      { title: "Longest Substring Without Repeating (LC #3)", difficulty: "med", tip: "Sliding window + set. Expand right, shrink left." },
      { title: "Permutation in String (LC #567)", difficulty: "med", tip: "Fixed-size window, Counter frequency match." },
      { title: "Minimum Size Subarray Sum (LC #209)", difficulty: "med", tip: "Variable sliding window — shrink left on sum >= target." },
    ],
    whatToSkip: [
      "Compiling Redis C source from scratch",
      "Manual Redis protocol RESP parser implementation",
    ],
  },
  "day-4-celery-async-reliability": {
    topicId: "day-4-celery-async-reliability",
    topicTitle: "Celery Task Queues & DLQ Reliability",
    sprintDay: 4,
    subtopics: [
      {
        id: "d4-1",
        title: "shared_task, bind=True, and Task Retries with Backoff",
        isHighRoi: true,
        description: "Configure reliable retries with exponential backoff and random jitter.",
        practiceDrill: "Write Celery task `@shared_task(bind=True, max_retries=5)` calling external HTTP API with retry backoff.",
        done: false,
      },
      {
        id: "d4-2",
        title: "Dead Letter Queues (DLQ) & Worker Crash Handling",
        isHighRoi: true,
        description: "Route permanently failed tasks to a inspection DLQ without blocking main queue.",
        practiceDrill: "Simulate worker `SIGKILL`; verify task is safely re-queued or routed to DLQ.",
        done: false,
      },
      {
        id: "d4-3",
        title: "ACKS_LATE vs Early Acknowledgements",
        isHighRoi: true,
        description: "Ensure at-least-once task delivery for idempotent background jobs.",
        practiceDrill: "Configure `task_acks_late = True` and `task_reject_on_worker_lost = True`.",
        done: false,
      },
      {
        id: "d4-4",
        title: "Task Idempotency & Distributed Locking",
        isHighRoi: true,
        description: "Prevent duplicate task execution using Redis lock keys (`SET NX EX`).",
        practiceDrill: "Wrap Celery task in Redis lock decorator ensuring single concurrent execution.",
        done: false,
      },
    ],
    dsaProblems: [
      { title: "Number of Islands (LC #200)", difficulty: "med", tip: "BFS or DFS grid traversal. Mark visited in-place." },
      { title: "Clone Graph (LC #133)", difficulty: "med", tip: "BFS + hashmap mapping old node → cloned node." },
      { title: "Course Schedule (LC #207)", difficulty: "med", tip: "DFS cycle detection on directed graph (3-state)." },
    ],
    whatToSkip: [
      "Custom Celery flower dashboard extensions",
      "Obscure AMQP protocol internals beyond basic queue routing",
    ],
  },
  "day-5-payment-system-design": {
    topicId: "day-5-payment-system-design",
    topicTitle: "Payment System Idempotency & Webhooks",
    sprintDay: 5,
    subtopics: [
      {
        id: "d5-1",
        title: "Razorpay/Stripe Idempotency Key Architecture",
        isHighRoi: true,
        description: "Header-based `Idempotency-Key` tracking preventing double billing on network retries.",
        practiceDrill: "Build idempotency middleware storing request hash & payload in Redis/Postgres.",
        done: false,
      },
      {
        id: "d5-2",
        title: "Payment State Machine & Webhook Delivery Retries",
        isHighRoi: true,
        description: "Manage transition: `CREATED -> PENDING -> CAPTURED / FAILED` safely.",
        practiceDrill: "Design webhook receiver verifying HMAC SHA256 signature and processing state transition idempotently.",
        done: false,
      },
      {
        id: "d5-3",
        title: "Transactional Outbox Pattern",
        isHighRoi: true,
        description: "Atomically save DB state and emit queue messages without dual-write inconsistency.",
        practiceDrill: "Write Django transaction block writing `Order` and `OutboxMessage` in same DB commit.",
        done: false,
      },
      {
        id: "d5-4",
        title: "Circuit Breaker Pattern for External Payment Gateways",
        isHighRoi: true,
        description: "Fail fast when payment gateway latency spikes, preventing connection pool exhaustion.",
        practiceDrill: "Implement Circuit Breaker (CLOSED -> OPEN -> HALF-OPEN) in Python.",
        done: false,
      },
    ],
    dsaProblems: [
      { title: "Top K Frequent Elements (LC #347)", difficulty: "med", tip: "Counter + heapq.nlargest or bucket sort." },
      { title: "Course Schedule II (LC #210)", difficulty: "med", tip: "Topological sort — BFS Kahn's algorithm." },
      { title: "Task Scheduler (LC #621)", difficulty: "med", tip: "Heap + greedy. Execute most frequent task first." },
    ],
    whatToSkip: [
      "PCI-DSS compliance hardware HSM integration (focus on tokenized architecture)",
      "Legacy card swipe protocol details",
    ],
  },
  "day-6-rag-architecture": {
    topicId: "day-6-rag-architecture",
    topicTitle: "RAG Qdrant Vector Search & Cross-Encoders",
    sprintDay: 6,
    subtopics: [
      {
        id: "d6-1",
        title: "Qdrant Vector DB HNSW Indexing & Distance Metrics",
        isHighRoi: true,
        description: "Cosine vs Dot Product vs Euclidean distance in high-dimensional vector spaces.",
        practiceDrill: "Initialize Qdrant collection with HNSW index payload filtering for multi-tenant tenant_id.",
        done: false,
      },
      {
        id: "d6-2",
        title: "Cross-Encoder Precision Reranking Tuning",
        isHighRoi: true,
        description: "Two-stage retrieval: Fast bi-encoder vector search top 50 -> Cross-encoder precision rerank top 5.",
        practiceDrill: "Build two-stage pipeline reducing latency while improving RAG retrieval precision by 35%.",
        done: false,
      },
      {
        id: "d6-3",
        title: "Semantic Chunking vs Sliding Window Chunking",
        isHighRoi: true,
        description: "Preserve document context boundaries to maximize vector embedding quality.",
        practiceDrill: "Implement recursive character chunker with overlap and metadata payload tagging.",
        done: false,
      },
      {
        id: "d6-4",
        title: "Ragas Evaluation Framework (Faithfulness & Answer Relevancy)",
        isHighRoi: true,
        description: "Quantitative evaluation of RAG hallucination and retrieval context recall.",
        practiceDrill: "Compute Faithfulness and Context Recall metrics across 20 test query benchmarks.",
        done: false,
      },
    ],
    dsaProblems: [
      { title: "Pacific Atlantic Water Flow (LC #417)", difficulty: "med", tip: "BFS from both ocean coasts inward. Find intersection." },
      { title: "Word Ladder (LC #127)", difficulty: "hard", tip: "BFS graph traversal. Level = shortest transformation steps." },
    ],
    whatToSkip: [
      "Training transformer embedding models from scratch",
      "Obscure vector quantization math details beyond HNSW basics",
    ],
  },
};

export function get8020PlanForTopic(topicId: string, topicTitle?: string): Topic8020Plan {
  if (DEFAULT_8020_PLANS[topicId]) {
    return DEFAULT_8020_PLANS[topicId];
  }

  // Generic 80/20 Plan Generator for custom topics
  const title = topicTitle || topicId;
  return {
    topicId,
    topicTitle: title,
    sprintDay: 1,
    subtopics: [
      {
        id: `${topicId}-sub-1`,
        title: `Core First Principles & Problem Statement of ${title}`,
        isHighRoi: true,
        description: `Understand why naive solutions fail and why ${title} is required at scale.`,
        practiceDrill: "Explain the baseline O(N) vs optimized O(1)/O(log N) mechanism out loud.",
        done: false,
      },
      {
        id: `${topicId}-sub-2`,
        title: `Internal Mechanisms & Data Structure Architecture`,
        isHighRoi: true,
        description: `Low-level memory layout, protocols, and internal state machine of ${title}.`,
        practiceDrill: "Draw the ASCII architectural flow diagram from memory.",
        done: false,
      },
      {
        id: `${topicId}-sub-3`,
        title: `Production Edge Cases, Concurrency & Failure Modes`,
        isHighRoi: true,
        description: "Network partitions, race conditions, memory leaks, and retry idempotency.",
        practiceDrill: "Walk through root cause post-mortem for failure scenarios.",
        done: false,
      },
      {
        id: `${topicId}-sub-4`,
        title: `Senior L6 Interview Drill & Trade-off Defense`,
        isHighRoi: true,
        description: "Defend latency vs throughput and memory vs CPU trade-offs under interrogation.",
        practiceDrill: "Answer 3 senior interview probing questions without notes.",
        done: false,
      },
    ],
    dsaProblems: [
      { title: "Two Sum (LC #1)", difficulty: "easy", tip: "HashMap O(N) lookup." },
      { title: "Binary Search (LC #704)", difficulty: "easy", tip: "O(log N) divide and conquer." },
      { title: "LRU Cache (LC #146)", difficulty: "med", tip: "HashMap + Doubly LinkedList O(1) ops." },
    ],
    whatToSkip: [
      "Low-ROI boilerplate code",
      "Depreciated legacy APIs",
      "Unnecessary configuration bloat",
    ],
  };
}
