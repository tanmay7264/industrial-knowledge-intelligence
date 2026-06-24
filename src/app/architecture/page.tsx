"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MermaidDiagram = dynamic(
  () => import("@/components/mermaid-diagram").then((m) => m.MermaidDiagram),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full rounded-lg" />,
  }
);

const ARCHITECTURE_CHART = `flowchart TB
    subgraph Ingest["Ingestion Pipeline"]
        U["Upload / Seed<br/>PDF, scan, XLSX, CSV, EML, TXT"]
        L["Loaders<br/>text + OCR fallback"]
        C["Semantic chunking<br/>hash-based dedup"]
        E["Entity extraction<br/>fast model + zod"]
        EM["Embeddings<br/>Jina / Ollama"]
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
        R{"Query Router<br/>fast model"}
        V["Vector retrieval"]
        G["Graph retrieval<br/>Cypher, 1-2 hops"]
        CA["Compliance agent<br/>per-requirement judge"]
        R -->|factual| V
        R -->|relational| G
        R -->|hybrid| V
        R -->|hybrid| G
        V --> S["Grounded synthesis<br/>quality model + citations"]
        G --> S
    end

    Q --> V
    N --> G
    Q --> CA
    N --> CA

    P["Model Provider Abstraction<br/>getChatModel(fast | quality)<br/>LLM_PROVIDER = groq | ollama | hosted"]
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

    Cache[("Redis<br/>semantic + report cache")] -.-> S
    Cache -.-> CA`;

const COMPONENTS: { layer: string; responsibility: string }[] = [
  { layer: "Ingestion", responsibility: "Parse any document, OCR scans, chunk, extract entities, embed" },
  { layer: "Vector store", responsibility: "Cosine similarity over 768-d embeddings (Qdrant)" },
  { layer: "Knowledge graph", responsibility: "Equipment, regulations, people, parameters and their links (Neo4j)" },
  { layer: "Router", responsibility: "Classify each query as factual / relational / hybrid" },
  { layer: "Synthesis", responsibility: "Grounded answer with inline [n] citations + confidence" },
  { layer: "Compliance agent", responsibility: "Judge each requirement vs. evidence, conservatively" },
  { layer: "Provider abstraction", responsibility: "One seam for every LLM call — swap to on-prem with zero code changes" },
];

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Architecture</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Ingestion feeds a vector store and a knowledge graph; an agentic router
            chooses vector, graph, or hybrid retrieval, and a compliance agent runs
            over the same corpus. Every model call passes through one provider seam.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <MermaidDiagram chart={ARCHITECTURE_CHART} id="architecture" />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Components
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {COMPONENTS.map((c) => (
                  <tr key={c.layer} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap w-44">
                      {c.layer}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {c.responsibility}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="text-base font-semibold">
            Provider abstraction & data sovereignty
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No route or agent imports a model SDK directly — everything goes through{" "}
            <code className="text-foreground">getChatModel(&quot;fast&quot; | &quot;quality&quot;)</code>{" "}
            and the embedding module. Because of that single seam, the deployment
            target is just an environment variable:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>
              <code className="text-foreground">LLM_PROVIDER=groq</code> — hosted open
              models for the fastest path.
            </li>
            <li>
              <code className="text-foreground">LLM_PROVIDER=ollama</code> — fully
              on-prem open models for data residency, with zero code changes.
            </li>
            <li>
              <code className="text-foreground">LLM_PROVIDER=hosted</code> — any
              OpenAI-compatible endpoint (private/regional cloud).
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Process data, incident records and compliance evidence can stay entirely
            inside the customer&apos;s perimeter while the identical retrieval, graph,
            and compliance logic runs unchanged.
          </p>
        </div>
      </div>
    </div>
  );
}
