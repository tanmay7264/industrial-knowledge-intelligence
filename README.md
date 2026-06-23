# Industrial Knowledge Intelligence

An AI platform for ingesting heterogeneous industrial documents (PDFs, scanned forms, spreadsheets, emails) and making them queryable via a cited RAG copilot backed by a live knowledge graph. Built for rapid iteration — the pipeline is modular so each stage can be demoed independently.

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

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The status panel on the landing page confirms all three services are reachable.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack |
| `npm run build` | Production build |
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
     RAG Copilot — cited answers + confidence
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
