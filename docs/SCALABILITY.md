# Scalability & Operations

How IKI goes from a hackathon corpus to a plant-wide (and multi-plant) deployment.
Numbers below are design targets and order-of-magnitude estimates, not benchmarks.

## 1. Incremental ingestion (never re-embed)

Every file is hashed with SHA-256 before processing. The hash keys both the Qdrant
points (deterministic UUIDv5 chunk IDs) and the Neo4j `Document` node, so:

- Re-uploading an unchanged file is a no-op — no re-chunking, no re-embedding.
- A changed file deletes only its prior points by `fileHash` and re-ingests.
- Embedding spend scales with **new/changed content**, not corpus size.

At ~3,200 chars/chunk, a 100-page document is ~80–120 chunks. Embedding is one
batched request; entity extraction runs 5 chunks at a time.

## 2. Async queue architecture (throughput)

Today ingestion runs inline in the request for demo simplicity. At scale, move it
behind a queue:

- **BullMQ on Redis**: the upload endpoint enqueues a job per file and returns
  immediately; a pool of workers performs load → chunk → extract → embed → upsert.
- Workers scale horizontally and independently of the web tier. Target ~50–100
  documents/minute per worker depending on OCR load; add workers linearly.
- Failed jobs retry with backoff; OCR-heavy scans get a longer-timeout queue.
- The same Redis already used for caching backs the queue — no new infrastructure.

## 3. Horizontal scale for the stores

- **Qdrant**: move from the single Docker node to a managed/clustered deployment
  with sharding + replication. Cosine search over millions of 768-d vectors stays
  in the low tens of milliseconds with HNSW; payload indexes on `docType` /
  `fileHash` keep metadata filters fast.
- **Neo4j**: managed Aura or a causal cluster (one leader, read replicas). Graph
  queries are bounded to 1–2 hops with `LIMIT`, so latency is driven by node
  degree, not total graph size. Add indexes on `:Equipment(name)`,
  `:RegulatoryRef(name)`, `:Document(fileHash)`.

## 4. Cost efficiency

- **Semantic cache**: repeated/near-identical queries are served from an in-memory
  cache keyed on the query embedding (cosine ≥ 0.95), skipping retrieval and
  generation entirely. In a live demo the same question costs the LLM once.
- **Small-model routing**: the router and entity extraction use the fast/cheap
  model (`llama-3.1-8b-instant`); only final synthesis and compliance judging use
  the quality model. Most tokens flow through the cheap tier.
- **Batched embeddings**: all chunks of a document embed in one request.
- The compliance report is cached in Redis with a TTL, so dashboards and audit
  exports read cache instead of re-running the agent over every requirement.

## 5. Multi-tenant isolation (plant / org level)

Industrial deployments are inherently multi-site. Isolation options, lightest first:

- **Payload/property scoping**: add `tenantId` to every Qdrant payload and Neo4j
  node; enforce it as a mandatory filter on all retrieval. Simple, one cluster.
- **Collection/database per tenant**: a Qdrant collection and a Neo4j database per
  plant — stronger blast-radius isolation, still one deployment.
- **Dedicated stack**: regulated customers get an isolated deployment (often
  on-prem, see below).

The cache keys and queue job names are namespaced by tenant so nothing leaks
across plants.

## 6. On-prem open-model deployment (data residency)

The provider abstraction (`getChatModel`, `embedBatch`) is the only place models are
referenced. Setting `LLM_PROVIDER=ollama` (or a private OpenAI-compatible vLLM
endpoint) runs every feature — retrieval, graph, synthesis, compliance — against
local open models with **zero code changes**. Sensitive process data, incident
records, and compliance evidence never leave the customer's network. This is the
default posture we would recommend for a real refinery.

## Summary

| Concern | Mechanism |
| --- | --- |
| Re-ingest cost | SHA-256 dedup + deterministic chunk IDs |
| Throughput | BullMQ + Redis workers, scale horizontally |
| Vector scale | Managed/clustered Qdrant, HNSW, payload indexes |
| Graph scale | Neo4j cluster, bounded-hop queries, label indexes |
| Latency/cost | Semantic cache + small-model routing + batching |
| Isolation | tenantId scoping → DB-per-tenant → dedicated stack |
| Data residency | `LLM_PROVIDER=ollama` on-prem, no code changes |
