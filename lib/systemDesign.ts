/**
 * System Design & Architecture Engineering Library
 * Holds architectural templates, trade-off matrices, and failure mode specifications.
 */

export interface SystemArchitectureTemplate {
  id: string;
  title: string;
  category: "Distributed Systems" | "Database & Storage" | "AI & ML Infra" | "High Concurrency";
  description: string;
  mermaidChart: string;
  tradeOffs: {
    metric: string;
    optionA: string;
    optionB: string;
    verdict: string;
  }[];
  failureModes: {
    mode: string;
    impact: string;
    mitigation: string;
  }[];
  seniorCriteria: string[];
}

export const PRESET_SYSTEM_DESIGNS: SystemArchitectureTemplate[] = [
  {
    id: "rate-limiter",
    title: "Distributed Rate Limiter (Sliding Window Counter)",
    category: "High Concurrency",
    description: "Multi-datacenter API gateway rate limiter using Redis Cluster & Token Bucket algorithm.",
    mermaidChart: `graph TD
    Client[Client Requests] --> Nginx[Nginx / Envoy Gateway]
    Nginx --> RateLimiter[Rate Limiter Middleware]
    RateLimiter -->|Check Bucket| Redis[(Redis Cluster)]
    Redis -->|Allowed| AppService[Backend Application Service]
    Redis -->|Exceeded 429| RateLimiter
    RateLimiter -->|HTTP 429 Too Many Requests| Client
    AppService --> DLQ[Kafka Dead Letter Queue]`,
    tradeOffs: [
      {
        metric: "Accuracy vs Latency",
        optionA: "Atomic Redis Lua Script",
        optionB: "Local In-Memory Counter with Background Sync",
        verdict: "Use Lua Script for strict billing limits; Local sync for public search APIs.",
      },
      {
        metric: "Algorithm Selection",
        optionA: "Fixed Window Counter",
        optionB: "Sliding Window Log / Counter",
        verdict: "Sliding Window Counter prevents 2x traffic bursts at window boundaries.",
      },
    ],
    failureModes: [
      {
        mode: "Redis Node Outage / Failover",
        impact: "Rate limiter blocked or fail-open risk",
        mitigation: "Graceful fail-open policy with local in-memory fallback limits.",
      },
      {
        mode: "Redis Hot Key Sharding Bottleneck",
        impact: "High CPU on single Redis shard for viral tenant",
        mitigation: "Pre-key hashing with local micro-buckets (Key: tenantId + microsecond_slot).",
      },
    ],
    seniorCriteria: [
      "Must state fail-open vs fail-closed policy explicitly.",
      "Must account for clock drift between distributed API gateway nodes.",
      "Must provide O(1) time complexity per rate check.",
    ],
  },
  {
    id: "idempotent-payments",
    title: "Payment Gateway Idempotency & Webhook Engine",
    category: "Distributed Systems",
    description: "Exactly-once transaction processing pipeline with distributed locking & transactional outbox.",
    mermaidChart: `graph TD
    Client[Mobile / Web App] -->|POST /payments Idempotency-Key| API[Payment API]
    API -->|Acquire Lock| RedisLock[(Redis Redlock)]
    API -->|Check Existing Result| DB[(Postgres DB)]
    API -->|Write Outbox Event| Outbox[Transactional Outbox Table]
    API -->|Publish Payment| Stripe[Stripe / Adyen Gateway]
    Outbox -->|CDC / Debezium| Kafka[Kafka Event Bus]
    Kafka -->|Webhook Delivery| Merchant[Merchant Service]`,
    tradeOffs: [
      {
        metric: "Locking Strategy",
        optionA: "Pessimistic DB Lock (SELECT FOR UPDATE)",
        optionB: "Redis Redlock + DB Unique Constraint",
        verdict: "Redis lock for fast rejection + DB UNIQUE (idempotency_key) as source of truth.",
      },
    ],
    failureModes: [
      {
        mode: "Webhook Delivery Timeout",
        impact: "Merchant system un-synced on payment status",
        mitigation: "Exponential backoff retries (1m, 5m, 15m, 1h) with Kafka DLQ & manual replay dashboard.",
      },
      {
        mode: "Double Click / Concurrent Charge Submissions",
        impact: "Duplicate payment charge attempt",
        mitigation: "Unique database index on (tenant_id, idempotency_key).",
      },
    ],
    seniorCriteria: [
      "Must explain Transactional Outbox Pattern to avoid 2-phase commit (2PC).",
      "Must define idempotency payload retention TTL (typically 24–72 hours).",
    ],
  },
  {
    id: "rag-vector-search",
    title: "Enterprise RAG Pipeline & Hybrid Vector Search",
    category: "AI & ML Infra",
    description: "Low-latency retrieval pipeline combining Sparse (BM25) & Dense (Qdrant Vector) search with Cross-Encoder Reranking.",
    mermaidChart: `graph TD
    UserQuery[User Natural Query] --> QueryEmbed[Embedding Service text-embedding-3]
    UserQuery --> BM25[Sparse BM25 Keyword Index]
    QueryEmbed --> VectorDB[(Qdrant / Milvus Vector DB)]
    VectorDB -->|Top-100 Dense| HybridFusion[Reciprocal Rank Fusion RRF]
    BM25 -->|Top-100 Sparse| HybridFusion
    HybridFusion -->|Top-50 Candidates| Reranker[BGE Cross-Encoder Reranker]
    Reranker -->|Top-5 High-Precision Passages| LLM[LLM Reasoning Engine]
    LLM --> Response[Cited Verified Response]`,
    tradeOffs: [
      {
        metric: "Search Precision",
        optionA: "Dense Vector Search Only",
        optionB: "Hybrid Vector + BM25 + Cross-Encoder Reranking",
        verdict: "Hybrid search avoids missing exact product IDs, error codes, or technical jargon.",
      },
    ],
    failureModes: [
      {
        mode: "Vector Index Memory Spike",
        impact: "HNSW index OOM crash",
        mitigation: "Scalar Quantization (SQ8) or Product Quantization (PQ) to reduce RAM by 4x.",
      },
    ],
    seniorCriteria: [
      "Must explain Reciprocal Rank Fusion (RRF) for combining dense & sparse scores.",
      "Must state latency budget breakdown (Embedding: 20ms, Vector: 30ms, Reranker: 50ms, LLM TTFT: 200ms).",
    ],
  },
];
