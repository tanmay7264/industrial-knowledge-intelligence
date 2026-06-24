# IKI Architecture

Industrial Knowledge Intelligence (IKI) turns heterogeneous plant documents into a
queryable knowledge system with three retrieval surfaces — cited question-answering,
a knowledge graph, and a compliance auditor — over a shared corpus.

## System diagram

```mermaid
flowchart TB
    subgraph Ingest["Ingestion Pipeline"]
        U["Upload / Seed<br/>PDF · scan · XLSX · CSV · EML · TXT"]
        L["Loaders<br/>(text + OCR fallback)"]
        C["Semantic chunking<br/>(hash-based dedup)"]
        E["Entity extraction<br/>(fast model + zod)"]
        EM["Embeddings<br/>(Jina / Ollama)"]
        U --> L --> C --> E
        C --> EM
    end

    subgraph Stores["Storage"]
        Q[("Qdrant<br/>vector store")]
        N[("Neo4j<br/>knowledge graph")]
    end

    E --> N
    EM --> Q

    subgraph Retrieval["Agentic Retrieval"]
        R{"Query Router<br/>(fast model)"}
        V["Vector retrieval"]
        G["Graph retrieval<br/>(Cypher, 1–2 hops)"]
        CA["Compliance agent<br/>(per-requirement judge)"]
        R -->|factual| V
        R -->|relational| G
        R -->|hybrid| V
        R -->|hybrid| G
        V --> S["Grounded synthesis<br/>(quality model + citations)"]
        G --> S
    end

    Q --> V
    N --> G
    Q --> CA
    N --> CA

    subgraph Provider["Model Provider Abstraction"]
        P["getChatModel(fast | quality)<br/>LLM_PROVIDER = groq | ollama | hosted"]
    end
    P -.-> E
    P -.-> R
    P -.-> S
    P -.-> CA

    subgraph UI["Next.js App Router UI"]
        UIc["/chat Q&A"]
        UIg["/graph explorer"]
        UIk["/compliance dashboard"]
        UId["/demo guided flow"]
    end

    S --> UIc
    G --> UIg
    CA --> UIk
    S --> UId
    CA --> UId

    Cache[("Redis<br/>semantic cache + report cache")] -.-> S
    Cache -.-> CA
```

## Components

| Layer | Responsibility | Key modules |
| --- | --- | --- |
| Ingestion | Parse any document, OCR scans, chunk, extract entities, embed | `src/lib/ingest/*` |
| Vector store | Cosine similarity search over 768-d embeddings | Qdrant, `src/lib/rag/retrieve.ts` |
| Knowledge graph | Documents, Equipment, RegulatoryRef, Person, Parameter and their relationships | Neo4j, `src/lib/graph/*` |
| Router | Classify each query as factual / relational / hybrid | `src/lib/rag/router.ts` |
| Synthesis | Grounded answer with inline `[n]` citations + confidence | `src/lib/rag/answer.ts` |
| Compliance agent | Judge each requirement vs. evidence, conservatively | `src/lib/agents/compliance.ts` |
| Provider abstraction | One seam for every LLM call | `src/lib/ai/provider.ts` |

## Model provider abstraction & data sovereignty

Every model call goes through `getChatModel("fast" | "quality")` and every embedding
through `src/lib/ai/embeddings.ts`. No route or agent imports a provider SDK directly.

Because of that single seam, the deployment target is an environment variable:

- `LLM_PROVIDER=groq` — hosted open models (Llama 3.1/3.3) for the fastest demo path.
- `LLM_PROVIDER=ollama` — fully **on-prem open models** for data residency. The same
  code runs against a local Ollama or vLLM endpoint with **zero code changes** —
  documents never leave the plant network.
- `LLM_PROVIDER=hosted` — any OpenAI-compatible endpoint (private cloud, regional).

This matters for industrial customers: process data, incident records and compliance
evidence are sensitive. IKI can run entirely inside the customer's perimeter while
keeping the identical retrieval, graph, and compliance logic.

See [SCALABILITY.md](./SCALABILITY.md) for throughput, multi-tenancy, and cost notes.
