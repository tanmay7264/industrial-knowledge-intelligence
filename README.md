# Industrial Brain

**An AI-powered Organizational Memory Platform for Unified Asset & Operations Intelligence.**

Industrial plants generate enormous knowledge every day — SOPs, incident reports, sensor readings, and the judgment calls of experienced engineers. Almost none of it is connected. When an expert retires or a shift changes, that knowledge disappears with them, and the next technician re-solves a problem that was already solved months earlier.

Industrial Brain captures that scattered knowledge — documents, sensor data, and past decisions — and structures it into a connected Knowledge Graph. An AI Copilot then reasons over that structured memory to answer real operational questions with cited evidence, not guesses, right when a technician needs it on the floor.

🔗 **Live demo:** [industrial-knowledge-intelligence-eight.vercel.app](https://industrial-knowledge-intelligence-eight.vercel.app/)
🎥 **Demo video:** [Watch on Google Drive](https://drive.google.com/file/d/1eiNNhm9_wvn6vf94xHhXxmbXqyTGYvVm/view?usp=drivesdk)

---

## What's inside

Every module is backed by real data — Qdrant vector search over ingested documents, a Neo4j knowledge graph, and an LLM reasoning layer — not static mock content.

| Module | What it does |
|---|---|
| **Command Center** | Live plant status, critical alerts, and recommended investigations — the mission-control starting point. |
| **Ask Memory** | Conversational search over decades of engineering experience, grounded in cited evidence. |
| **Asset 360** | A digital identity card for every machine — health, risk, and how much organizational knowledge exists for it. |
| **Document Intelligence** | Add SOPs, incident reports, and manuals here. Every upload makes the AI smarter. |
| **AI Reasoning** | A visual graph explaining *why* the AI reached a given recommendation — the evidence chain behind every answer. |
| **Investigate** | Runs a full AI root-cause investigation on a machine problem: root cause, confidence, supporting evidence, and a step-by-step action plan. |
| **Failure Intelligence** | A searchable archive of every historical failure, complete with root cause, resolution timeline, and lessons learned. |
| **Operational Intelligence** | AI-generated alerts and discoveries surfaced from patterns in organizational memory. |
| **Memory Continuity** | Tracks which experts are retiring and how much of their knowledge has actually been captured before they go. |
| **Operational Playbooks** | Auto-generates step-by-step repair playbooks straight from organizational memory. |
| **How It Works** | A plain-language walkthrough of the whole workflow, plus a guided in-app tour that spotlights every module for first-time users. |

Every AI recommendation across the app is evidence-backed: click through and it links straight back to the source SOP section, incident report, or sensor reading it came from — nothing is a black box.

---

## Tech stack

- **Framework:** Next.js 15 (App Router, Turbopack) + React 19 + TypeScript
- **UI:** Tailwind CSS v4, Base UI primitives, Recharts, react-force-graph, Mermaid
- **AI:** Vercel AI SDK — Groq (Llama 3.3 / 3.1) for reasoning, Jina AI for embeddings
- **Vector store:** Qdrant — semantic document retrieval
- **Knowledge graph:** Neo4j — assets, incidents, experts, and their relationships
- **Cache / job queue:** Redis
- **Document processing:** pdf-parse, pdfjs-dist, Tesseract OCR, xlsx, mailparser

---

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

Ingests the bundled `sample-docs/` (a mix of real regulatory extracts and realistic synthesized operational records) into Qdrant and Neo4j. Requires the API keys from step 2 — the script runs a credential preflight and exits early if they're missing.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it lands on the Command Center. The top bar shows live status for Qdrant, Neo4j, and Redis. New here? Click the compass icon in the header for a guided tour of every module, or visit **[/how-it-works](http://localhost:3000/how-it-works)** for the plain-language version.

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

Industrial Brain is a layered architecture — every layer exists to make the one above it more reliable. Data becomes knowledge, knowledge becomes a graph, and the graph becomes something an LLM can reason over with evidence, instead of guessing.

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
       Retrieval-Augmented Reasoning
       (vector / graph / hybrid)
                ▼
   AI Copilot — cited answers + confidence
                ▼
   Investigation Engine — root cause,
   evidence, action plan, playbook
                ▼
   Engineer confirms → written back to
   the Knowledge Graph as Organizational
   Memory for the next investigation
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

This is a multi-service app: the Next.js frontend plus three backing stores (Qdrant, Neo4j, Redis). The live demo runs on **Vercel** for the app, backed by managed Qdrant Cloud, Neo4j Aura, and a hosted Redis instance. Two other realistic paths:

### Option A — Vercel (frontend) + managed stores *(what the live demo uses)*

Deploy the Next.js app to [Vercel](https://vercel.com); back it with managed [Qdrant Cloud](https://cloud.qdrant.io), [Neo4j Aura](https://neo4j.com/aura), and a managed Redis instance (e.g. [Upstash](https://upstash.com)) — all have free tiers. Set the same env vars from `.env.example` in the Vercel project settings. Note: document **ingestion** uses native OCR/canvas libraries and a long `maxDuration`; run seeding/ingestion outside Vercel's serverless functions (e.g. locally or a worker), and use Vercel for the read paths (Copilot, Investigate, Graph, etc.).

### Option B — Container platform (whole stack in one place)

[Railway](https://railway.app) or [Render](https://render.com) can run the app and the three stores as services from their Docker images, mirroring `docker-compose.yml`.

1. Push this repo to GitHub (done).
2. Create a project from the repo; add three services from images: `qdrant/qdrant`, `neo4j:5` (set `NEO4J_AUTH`), `redis:7`. Attach a volume to each.
3. Add the Next.js service (build `npm run build`, start `npm start`). Set env vars: `QDRANT_URL`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `REDIS_URL`, `GROQ_API_KEY`, `JINA_API_KEY`, `LLM_PROVIDER=groq` (point the URLs at the internal service hostnames).
4. Run `npm run seed` once (a one-off job or locally against the deployed stores).

### Option C — Single VM

Provision a small VM (DigitalOcean, Hetzner, Lightsail), install Docker, then run the existing `docker-compose.yml` plus the app container. Closest to local; you manage the host.

In all cases: set real env vars on the platform (never commit `.env.local`), and run `npm run seed` once so the corpus is populated.

---

## Developed by

**Omkar Hattikar** and **Tanmay Narnaware**
