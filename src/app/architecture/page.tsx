"use client";

import dynamic from "next/dynamic";
import { Activity, Database, Server } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

const MermaidDiagram = dynamic(
  () => import("@/components/mermaid-diagram").then((m) => m.MermaidDiagram),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full rounded-xl" />,
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

const TECH_STACK = ["Next.js 15", "Qdrant", "Neo4j", "Groq", "Redis", "Vercel"];

export default function ArchitecturePage() {
  return (
    <PageShell
      title="System Architecture"
      subtitle="Ingestion feeds vector store and knowledge graph; agentic router chooses retrieval path. Every model call passes through one provider seam."
      maxWidth="lg"
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Services Online"
            value="4/4"
            icon={Server}
            trend={0}
            trendLabel="Qdrant · Neo4j · Redis · Groq"
            sparklineData={sparklineFromSeed(4)}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="Documents Indexed"
            value={31}
            icon={Database}
            trend={12}
            sparklineData={sparklineFromSeed(31)}
          />
          <HeroMetricCard
            label="Avg Query Latency"
            value="1.2s"
            icon={Activity}
            trend={-15}
            sparklineData={sparklineFromSeed(12)}
          />
        </HeroBand>
      }
    >
      <ContentCard>
        <MermaidDiagram chart={ARCHITECTURE_CHART} id="architecture" />
      </ContentCard>

      <div className="flex flex-wrap gap-2">
        {TECH_STACK.map((t) => (
          <Badge key={t} variant="outline" className="text-xs">
            {t}
          </Badge>
        ))}
      </div>

      <ContentCard title="Components">
        <div className="overflow-hidden rounded-xl border border-border/60">
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
      </ContentCard>

      <ContentCard title="Provider abstraction & data sovereignty">
        <p className="text-sm text-muted-foreground leading-relaxed">
          No route or agent imports a model SDK directly — everything goes through{" "}
          <code className="text-foreground bg-muted px-1 rounded">
            getChatModel(&quot;fast&quot; | &quot;quality&quot;)
          </code>
          . Deployment target is an environment variable:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mt-3">
          <li>
            <code className="text-foreground">LLM_PROVIDER=groq</code> — hosted open models
          </li>
          <li>
            <code className="text-foreground">LLM_PROVIDER=ollama</code> — fully on-prem, zero code changes
          </li>
          <li>
            <code className="text-foreground">LLM_PROVIDER=hosted</code> — any OpenAI-compatible endpoint
          </li>
        </ul>
      </ContentCard>
    </PageShell>
  );
}
