import type { RetrievedChunk } from "./retrieve";
import type { SubgraphData } from "@/lib/graph/types";

export interface Source {
  n: number;
  fileName: string;
  page: number | string;
  snippet: string;
  score: number;
}

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface ChatAnswer {
  answer: string;
  sources: Source[];
  confidence: ConfidenceLevel;
  abstained: boolean;
}

export function computeConfidence(
  scores: number[],
  abstained: boolean,
  hasGraphEvidence = false
): ConfidenceLevel {
  if (abstained) return "Low";
  // Graph-only answers carry no vector similarity scores. Treat solid graph
  // evidence as Medium instead of defaulting to Low for the absence of scores.
  if (scores.length === 0) return hasGraphEvidence ? "Medium" : "Low";
  const topScores = scores.slice(0, 3);
  const avg = topScores.reduce((a, b) => a + b, 0) / topScores.length;
  if (avg >= 0.75) return "High";
  if (avg >= 0.52) return "Medium";
  return "Low";
}

export function sourcesFromChunks(chunks: RetrievedChunk[]): Source[] {
  return chunks.map((c, i) => ({
    n: i + 1,
    fileName: c.fileName,
    page: c.pageOrSection,
    snippet: c.snippet,
    score: c.score,
  }));
}

/** Citation sources derived from Document nodes when retrieval is graph-only. */
export function sourcesFromSubgraph(subgraph: SubgraphData | null): Source[] {
  if (!subgraph || subgraph.nodes.length === 0) return [];
  const docs = subgraph.nodes.filter((n) => n.type === "Document");
  const items = docs.length > 0 ? docs : subgraph.nodes.slice(0, 6);
  return items.map((n, i) => ({
    n: i + 1,
    fileName: n.label,
    page: "graph",
    snippet: `Knowledge graph entity (${n.type})`,
    score: 1,
  }));
}

function numberedGraphDocSection(subgraph: SubgraphData): string {
  const docs = subgraph.nodes.filter((n) => n.type === "Document");
  if (docs.length === 0) return "";
  return `\n\nDOCUMENT CONTEXT (from knowledge graph):\n${docs
    .map(
      (d, i) =>
        `[${i + 1}] (${d.label}, graph-linked)\nReferenced in graph relationships for this query.`
    )
    .join("\n\n---\n\n")}`;
}

export function buildSystemPrompt(
  chunks: RetrievedChunk[],
  graphContext?: string,
  subgraph?: SubgraphData | null
): string {
  const header = `You are an expert industrial knowledge assistant for an IKI (Industrial Knowledge Intelligence) system.

Answer the user's question using ONLY the context provided below.

RULES:
1. Cite every factual claim with its source number inline, e.g. [1] or [2][3].
2. If the context does not contain enough information to answer, respond with exactly: "Not found in the knowledge base"
3. Never fabricate information not present in the context.
4. Be precise and concise. Prefer bullet points for lists of facts.`;

  const docSection =
    chunks.length > 0
      ? `\n\nDOCUMENT CONTEXT:\n${chunks
          .map(
            (c, i) =>
              `[${i + 1}] (${c.fileName}, section ${c.pageOrSection})\n${c.text}`
          )
          .join("\n\n---\n\n")}`
      : subgraph
        ? numberedGraphDocSection(subgraph)
        : "";

  const graphSection = graphContext
    ? `\n\n${graphContext}`
    : "";

  return `${header}${docSection}${graphSection}`;
}
