# Industrial Knowledge Intelligence

An AI platform for ingesting heterogeneous industrial documents (PDFs, scanned forms, spreadsheets, emails) and making them queryable through three surfaces: cited question-answering, a live knowledge graph, and an automated compliance gap detector. The pipeline is modular so each stage can be demoed independently.

## Prerequisites

- Node.js 18+
- Docker and Docker Compose

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in at minimum:

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — free tier |
| `JINA_API_KEY` | [jina.ai](https://jina.ai) — free tier |

### 3. Start infrastructure

```bash
npm run infra:up
```

Starts Qdrant, Neo4j, and Redis in Docker. First run downloads images (~1 min).

### 4. Seed the demo corpus

```bash
npm run seed
```

Ingests the bundled `sample-docs/` (a mix of real regulatory extracts and realistic
synthesized operational records) into Qdrant and Neo4j. Requires the API keys from
step 2 — the script runs a credential preflight and exits early if they're missing.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The status panel confirms all three services are reachable. The fastest tour is **[/demo](http://localhost:3000/demo)** — a guided flow that runs the four headline queries end to end.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack |
| `npm run build` | Production build |
| `npm run seed` | Ingest `sample-docs/` into Qdrant + Neo4j |
| `npm run build:graph` | Backfill the knowledge graph from existing Qdrant points |
| `npm run infra:up` | Start Docker services (detached) |
| `npm run infra:down` | Stop and remove containers |
| `npm run infra:logs` | Tail Docker service logs |

---

## Architecture

```
Documents (PDF, DOCX, images, CSV, email)
        │
        ▼
   Document Loaders + OCR fallback
        │
        ▼
   Semantic Chunking + Metadata Tagging
        │
        ▼
   Entity Extraction (Zod-validated)
        │
   ┌────┴────────────────────┐
   ▼                         ▼
Qdrant (vector store)    Neo4j (knowledge graph)
   └────────────┬────────────┘
                ▼
       GraphRAG Query Router
       (vector / graph / hybrid)
                ▼
     Cited Q&A — answers + confidence
                ▼
     Compliance Gap Detection Agent
```

### Infrastructure

| Service | Purpose | Port |
|---|---|---|
| Qdrant | Vector store — semantic similarity search | 6333 |
| Neo4j  | Knowledge graph — entity relationships | 7474 (UI), 7687 (Bolt) |
| Redis  | Job queue and response cache | 6379 |

### LLM Providers

Configured via `LLM_PROVIDER` in `.env.local`:

| Value | Description |
|---|---|
| `groq` (default) | Groq API — llama-3.3-70b for synthesis, llama-3.1-8b for fast routing |
| `ollama` | Local Ollama instance (on-prem deployment story) |
| `hosted` | Any OpenAI-compatible endpoint via `HOSTED_BASE_URL` |

**Embeddings**: Jina AI `jina-embeddings-v2-base-en` (768d). Falls back to Ollama `nomic-embed-text` if `JINA_API_KEY` is not set.

---

## Verifying the health endpoint

```bash
curl http://localhost:3000/api/health
# {"qdrant":"ok","neo4j":"ok","redis":"ok"}
```

---

## Deployment

This is a multi-service app: the Next.js frontend plus three backing stores (Qdrant,
Neo4j, Redis). It is **not** a one-click static deploy — the databases must be reachable
from wherever the app runs. Three realistic paths:

### Option A — Container platform (recommended, whole stack in one place)

[Railway](https://railway.app) or [Render](https://render.com) can run the app and the
three stores as services from their Docker images, mirroring `docker-compose.yml`.

1. Push this repo to GitHub (done).
2. Create a project from the repo; add three services from images: `qdrant/qdrant`,
   `neo4j:5` (set `NEO4J_AUTH`), `redis:7`. Attach a volume to each.
3. Add the Next.js service (build `npm run build`, start `npm start`). Set env vars:
   `QDRANT_URL`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `REDIS_URL`,
   `GROQ_API_KEY`, `JINA_API_KEY`, `LLM_PROVIDER=groq` (point the URLs at the internal
   service hostnames).
4. Run `npm run seed` once (a one-off job or locally against the deployed stores).

### Option B — Vercel (frontend) + managed stores

Deploy the Next.js app to [Vercel](https://vercel.com); back it with managed
[Qdrant Cloud](https://cloud.qdrant.io), [Neo4j Aura](https://neo4j.com/aura), and
[Upstash Redis](https://upstash.com) (all have free tiers). Set the same env vars in
Vercel. Note: document **ingestion** uses native OCR/canvas libraries and a long
`maxDuration`; run seeding/ingestion outside Vercel's serverless functions (e.g.
locally or a worker), and use Vercel for the read paths (Q&A, graph, compliance).

### Option C — Single VM

Provision a small VM (DigitalOcean, Hetzner, Lightsail), install Docker, then run the
existing `docker-compose.yml` plus the app container. Closest to local; you manage the host.

In all cases: set real env vars on the platform (never commit `.env.local`), and run
`npm run seed` once so the corpus is populated.
