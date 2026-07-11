import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { retrieveChunks } from "./retrieve";
import { retrieveSubgraph } from "@/lib/graph/retrieve";
import {
  sourcesFromChunks,
  sourcesFromSubgraph,
  buildSystemPrompt,
} from "./answer";
import type { RetrievedChunk } from "./retrieve";
import type { SubgraphData } from "@/lib/graph/types";
import type { Source } from "./answer";

export type RetrievalMode = "vector" | "graph" | "hybrid";

export interface RoutedContext {
  chunks: RetrievedChunk[];
  subgraph: SubgraphData | null;
  mode: RetrievalMode;
  systemPrompt: string;
  sources: Source[];
  scores: number[];
}

export interface QueryRoute {
  mode: RetrievalMode;
  entities: string[];
}

const ROUTER_SYSTEM = `You route industrial knowledge queries for retrieval and extract their key entities.
Return ONLY a JSON object — no markdown, no commentary:
{"mode": "vector" | "graph" | "hybrid", "entities": ["..."]}

mode:
  vector → factual lookup, specific value, "what is", "how much", "list the steps"
  graph  → relationships, multi-hop, "what governs", "which documents mention X", "trace", "connected to", "all equipment under"
  hybrid → both factual context AND relationship context are needed to answer fully

entities → equipment tags, regulation codes, and proper nouns named in the query (e.g. ["P-101","ISO 9001","Smith"]). Empty array if none.`;

function isMode(value: unknown): value is RetrievalMode {
  return value === "vector" || value === "graph" || value === "hybrid";
}

// One fast-model call does both routing and entity extraction, so graph and
// hybrid queries no longer pay a second LLM round-trip to pull out their terms.
export async function routeAndExtract(query: string): Promise<QueryRoute> {
  try {
    const result = await generateText({
      model: getChatModel("fast"),
      system: ROUTER_SYSTEM,
      prompt: query,
      maxOutputTokens: 120,
      temperature: 0,
      // Don't stall the whole request on a routing rate-limit; fall back to vector.
      maxRetries: 0,
    });
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        mode?: unknown;
        entities?: unknown;
      };
      const mode = isMode(parsed.mode) ? parsed.mode : "vector";
      const entities = Array.isArray(parsed.entities)
        ? parsed.entities.map(String).filter(Boolean).slice(0, 8)
        : [];
      return { mode, entities };
    }
  } catch {}
  return { mode: "vector", entities: [] };
}

export async function routedRetrieve(
  query: string,
  queryEmbedding: number[],
  mode: RetrievalMode,
  entities: string[],
  docTypeFilter?: string
): Promise<RoutedContext> {
  const needsVector = mode === "vector" || mode === "hybrid";
  const needsGraph = mode === "graph" || mode === "hybrid";

  // Reuse the embedding already computed for the cache lookup, and run the
  // vector and graph lookups concurrently for hybrid queries. Graph retrieval
  // reuses the entities from routing, so it skips its own extraction call.
  let graphFailed = false;
  const vectorP: Promise<RetrievedChunk[]> = needsVector
    ? retrieveChunks(query, { docTypeFilter, queryVector: queryEmbedding })
    : Promise.resolve([]);
  const graphP: Promise<SubgraphData | null> = needsGraph
    ? retrieveSubgraph(query, entities).catch(() => {
        graphFailed = true;
        return null;
      })
    : Promise.resolve(null);

  const results = await Promise.all([vectorP, graphP]);
  let chunks = results[0];
  const subgraph = results[1];

  // Graph-only query whose graph lookup failed — fall back to vector retrieval.
  if (mode === "graph" && graphFailed) {
    chunks = await retrieveChunks(query, {
      docTypeFilter,
      queryVector: queryEmbedding,
    });
  }

  let sources = sourcesFromChunks(chunks);
  if (sources.length === 0 && subgraph) {
    sources = sourcesFromSubgraph(subgraph);
  }
  const scores = chunks.map((c) => c.score);
  const graphContext =
    subgraph && subgraph.nodes.length > 0 ? subgraph.textContext : undefined;
  const systemPrompt = buildSystemPrompt(chunks, graphContext, subgraph);

  return { chunks, subgraph, mode, systemPrompt, sources, scores };
}
