import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { retrieveChunks } from "./retrieve";
import { retrieveSubgraph } from "@/lib/graph/retrieve";
import { sourcesFromChunks, buildSystemPrompt } from "./answer";
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

const CLASSIFIER_SYSTEM = `You classify industrial knowledge queries for retrieval routing.
Respond with EXACTLY ONE WORD from this set: vector, graph, hybrid

vector  → factual lookup, specific value, "what is", "how much", "list the steps"
graph   → relationships, multi-hop, "what governs", "which documents mention X", "trace", "connected to", "all equipment under"
hybrid  → both factual context AND relationship context needed to answer fully`;

async function classifyQuery(query: string): Promise<RetrievalMode> {
  try {
    const result = await generateText({
      model: getChatModel("fast"),
      system: CLASSIFIER_SYSTEM,
      prompt: query,
      maxOutputTokens: 10,
      temperature: 0,
    });
    const word = result.text.trim().toLowerCase();
    if (word === "graph" || word === "hybrid") return word;
    return "vector";
  } catch {
    return "vector";
  }
}

export async function routedRetrieve(
  query: string,
  queryEmbedding: number[],
  docTypeFilter?: string
): Promise<RoutedContext> {
  const mode = await classifyQuery(query);

  let chunks: RetrievedChunk[] = [];
  let subgraph: SubgraphData | null = null;

  if (mode === "vector" || mode === "hybrid") {
    chunks = await retrieveChunks(query, { docTypeFilter });
  }

  if (mode === "graph" || mode === "hybrid") {
    try {
      subgraph = await retrieveSubgraph(query);
    } catch {
      // Neo4j unavailable — degrade gracefully
      if (mode === "graph") {
        // Fall back to vector if graph fails entirely
        chunks = await retrieveChunks(query, { docTypeFilter });
      }
    }
  }

  const sources = sourcesFromChunks(chunks);
  const scores = chunks.map((c) => c.score);
  const graphContext =
    subgraph && subgraph.nodes.length > 0 ? subgraph.textContext : undefined;
  const systemPrompt = buildSystemPrompt(chunks, graphContext);

  return { chunks, subgraph, mode, systemPrompt, sources, scores };
}
