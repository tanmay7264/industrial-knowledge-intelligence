import type { RetrievedChunk } from "./retrieve";

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
  abstained: boolean
): ConfidenceLevel {
  if (abstained || scores.length === 0) return "Low";
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

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const contextBlocks = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.fileName}, section ${c.pageOrSection})\n${c.text}`
    )
    .join("\n\n---\n\n");

  return `You are an expert industrial knowledge assistant for an IKI (Industrial Knowledge Intelligence) system.

Answer the user's question using ONLY the numbered context passages provided below.

RULES:
1. Cite every factual claim with its source number inline, e.g. [1] or [2][3].
2. If the context passages do not contain enough information to answer, respond with exactly: "Not found in the knowledge base"
3. Never fabricate information, numbers, or references not present in the context.
4. Be precise and concise. Prefer bullet points for lists of facts.

CONTEXT:
${contextBlocks}`;
}
