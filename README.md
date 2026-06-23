# Industrial Knowledge Intelligence

An AI-powered knowledge intelligence platform for industrial domains. Ingests multi-format documents (PDFs, manuals, SOPs, compliance reports), extracts structured entities, builds a knowledge graph, and exposes a GraphRAG copilot with cited, confidence-scored answers.

## Architecture

```
Documents (PDF, DOCX, images)
        │
        ▼
   Document Loaders (OCR fallback)
        │
        ▼
   Semantic Chunking + Metadata Tagging
        │
        ▼
   Entity Extraction (Zod-validated)
        │
   ┌────┴────┐
   ▼         ▼
Vector Store  Knowledge Graph
(Qdrant)     (Neo4j / in-memory)
   └────┬────┘
        ▼
   GraphRAG Query Router
   (vector / graph / hybrid)
        │
        ▼
   RAG Copilot (cited answers + confidence)
        │
        ▼
   Compliance Gap Detection Agent
        │
        ▼
   Dashboard UI (Next.js)
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes / Node.js |
| LLM | Configurable provider abstraction (Anthropic Claude) |
| Vector DB | Qdrant |
| Graph DB | Neo4j (or in-memory fallback) |
| OCR | Tesseract.js / AWS Textract |
| Validation | Zod |
| Container | Docker Compose |

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env.local
# Fill in your API keys

# Start infrastructure
docker compose up -d

# Run dev server
npm run dev
```

## Project Structure

```
src/
  app/           # Next.js app router pages
  components/    # UI components
  lib/
    loaders/     # Document loaders (PDF, DOCX, OCR)
    chunking/    # Semantic chunking strategies
    extraction/  # Entity extraction pipeline
    graph/       # Knowledge graph builder
    rag/         # RAG query engine + copilot
    vector/      # Vector store client (Qdrant)
    compliance/  # Compliance gap detection
    providers/   # LLM provider abstraction
  types/         # Shared Zod schemas + TypeScript types
docker/          # Docker configs
```
