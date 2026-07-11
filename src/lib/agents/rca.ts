import { z } from "zod";
import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { embedSingle } from "@/lib/ai/embeddings";
import { retrieveChunks } from "@/lib/rag/retrieve";
import {
  findSimilarIncidents,
  getLessonsForAsset,
} from "@/lib/graph/retrieve";
import type { RetrievedChunk } from "@/lib/rag/retrieve";
import type { EvidenceCitation } from "./compliance-types";
import type { RCAReport } from "./rca-types";

const TOP_K = 10;
const EVIDENCE_FLOOR = 0.22;

const RCALLMSchema = z.object({
  asset: z.string().min(1),
  primaryHypothesis: z.string().min(1),
  confidence: z.number().min(0).max(100),
  alternativeHypotheses: z
    .array(z.object({ cause: z.string(), confidence: z.number() }))
    .default([]),
  verificationTests: z.array(z.string()).default([]),
  correctiveActions: z
    .array(
      z.object({
        action: z.string(),
        urgency: z.string(),
        impact: z.string(),
      })
    )
    .default([]),
  relatedAssets: z.array(z.string()).default([]),
  evidenceIndices: z.array(z.number().int()).default([]),
});

const RCA_SYSTEM = `You are a Root Cause Analysis agent for industrial equipment failures.
Return ONLY valid JSON:
{
  "asset": "equipment tag",
  "primaryHypothesis": "most likely root cause",
  "confidence": 0-100,
  "alternativeHypotheses": [{"cause": "...", "confidence": 0-100}],
  "verificationTests": ["test to confirm or reject hypothesis"],
  "correctiveActions": [{"action": "...", "urgency": "Immediate|High|Medium|Low", "impact": "..."}],
  "relatedAssets": ["P-305", "P-318"],
  "evidenceIndices": [numbers of evidence blocks relied on]
}
Rules:
- Ground hypotheses ONLY in numbered EVIDENCE blocks and graph context.
- Look for recurring patterns: bearing failures without alignment, cavitation, NPSH issues.
- Include verification tests that maintenance can run before closing work orders.
- Lower confidence if evidence is thin.`;

function citationsFromIndices(
  chunks: RetrievedChunk[],
  indices: number[]
): EvidenceCitation[] {
  return indices
    .filter((i) => i >= 1 && i <= chunks.length)
    .map((i) => {
      const c = chunks[i - 1];
      return {
        n: i,
        fileName: c.fileName,
        page: c.pageOrSection,
        snippet: c.snippet,
        score: c.score,
      };
    });
}

function extractAsset(query: string, assetHint?: string): string {
  if (assetHint) return assetHint;
  const match = query.match(/\b[PpBbVvHhCcMmTtFf]-?\d{2,4}\b/);
  return match?.[0]?.toUpperCase() ?? "Unknown";
}

export async function generateRCA(
  query: string,
  assetHint?: string
): Promise<RCAReport> {
  const asset = extractAsset(query, assetHint);
  const embedding = await embedSingle(query);

  const [chunks, graphIncidents, lessons] = await Promise.all([
    retrieveChunks(query, { topK: TOP_K, queryVector: embedding }),
    findSimilarIncidents(asset, ["failure", "bearing", "vibration", "cavitation"]),
    getLessonsForAsset(asset),
  ]);

  const filtered = chunks.filter((c) => c.score >= EVIDENCE_FLOOR);

  const evidenceBlocks = filtered
    .map(
      (c, i) =>
        `[${i + 1}] (${c.fileName}, section ${c.pageOrSection}, similarity ${c.score.toFixed(2)})\n${c.text.slice(0, 900)}`
    )
    .join("\n\n---\n\n");

  const incidentBlock =
    graphIncidents.length > 0
      ? `\n\nGRAPH INCIDENTS:\n${graphIncidents.map((inc) => `- ${inc.id}: ${inc.summary}`).join("\n")}`
      : "";

  const lessonBlock =
    lessons.length > 0
      ? `\n\nLESSONS:\n${lessons.map((l) => `- ${l.text}`).join("\n")}`
      : "";

  const result = await generateText({
    model: getChatModel("quality"),
    system: RCA_SYSTEM,
    prompt: `ASSET: ${asset}\nQUERY: ${query}\n\nEVIDENCE:\n${evidenceBlocks || "(none)"}${incidentBlock}${lessonBlock}`,
    maxOutputTokens: 1000,
    temperature: 0.1,
    maxRetries: 1,
  });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("RCA generation returned invalid JSON");

  const parsed = RCALLMSchema.parse(JSON.parse(jsonMatch[0]));
  const evidence = citationsFromIndices(filtered, parsed.evidenceIndices);

  const avgScore =
    filtered.length > 0
      ? filtered.slice(0, 4).reduce((a, c) => a + c.score, 0) /
        Math.min(4, filtered.length)
      : 0;
  const confidence = Math.min(
    99,
    Math.max(parsed.confidence, Math.round(avgScore * 100) + (graphIncidents.length > 0 ? 8 : 0))
  );

  return {
    asset: parsed.asset,
    primaryHypothesis: parsed.primaryHypothesis,
    confidence,
    supportingEvidence:
      evidence.length > 0
        ? evidence
        : filtered.slice(0, 5).map((c, i) => ({
            n: i + 1,
            fileName: c.fileName,
            page: c.pageOrSection,
            snippet: c.snippet,
            score: c.score,
          })),
    alternativeHypotheses: parsed.alternativeHypotheses,
    verificationTests: parsed.verificationTests,
    correctiveActions: parsed.correctiveActions,
    relatedAssets: parsed.relatedAssets,
    generatedAt: new Date().toISOString(),
    query,
  };
}
