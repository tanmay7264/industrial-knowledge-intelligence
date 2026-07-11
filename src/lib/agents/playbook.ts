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
import type { OperationalPlaybook } from "./playbook-types";

const TOP_K = 8;
const EVIDENCE_FLOOR = 0.25;

const PlaybookLLMSchema = z.object({
  asset: z.string().min(1),
  issue: z.string().min(1),
  mostCommonRootCause: z.string().min(1),
  previousSuccessfulResolution: z.string().min(1),
  lessonsLearned: z.array(z.string()).default([]),
  expertRecommendation: z.string().min(1),
  evidenceIndices: z.array(z.number().int()).default([]),
  confidenceScore: z.number().min(0).max(100).default(70),
});

const PLAYBOOK_SYSTEM = `You synthesize an Operational Playbook from organizational memory — incidents, work orders, expert interviews, SOPs, and vendor manuals.
Return ONLY valid JSON:
{
  "asset": "equipment tag e.g. P-101",
  "issue": "concise issue description",
  "mostCommonRootCause": "most common root cause from evidence",
  "previousSuccessfulResolution": "what worked before e.g. Alignment Procedure Rev B",
  "lessonsLearned": ["lesson strings from evidence"],
  "expertRecommendation": "expert quote or recommendation — cite tacit knowledge if present",
  "evidenceIndices": [numbers of evidence blocks relied on],
  "confidenceScore": 0-100 based on evidence strength
}
Rules:
- Ground every field in the numbered EVIDENCE blocks only.
- Prefer historical incidents and expert interviews over generic advice.
- If evidence is thin, lower confidenceScore below 60.
- expertRecommendation should sound like field wisdom, not generic AI advice.`;

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

function buildPrompt(
  query: string,
  chunks: RetrievedChunk[],
  graphIncidents: Awaited<ReturnType<typeof findSimilarIncidents>>,
  lessons: Awaited<ReturnType<typeof getLessonsForAsset>>
): string {
  const evidenceBlocks = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.fileName}, section ${c.pageOrSection}, similarity ${c.score.toFixed(2)})\n${c.text.slice(0, 800)}`
    )
    .join("\n\n---\n\n");

  const incidentBlock =
    graphIncidents.length > 0
      ? `\n\nGRAPH — SIMILAR INCIDENTS:\n${graphIncidents
          .map(
            (inc) =>
              `- ${inc.id}${inc.date ? ` (${inc.date})` : ""}: ${inc.summary}`
          )
          .join("\n")}`
      : "";

  const lessonBlock =
    lessons.length > 0
      ? `\n\nGRAPH — LESSONS LEARNED:\n${lessons.map((l) => `- ${l.text}${l.expertName ? ` (${l.expertName})` : ""}`).join("\n")}`
      : "";

  return `USER QUERY: ${query}

EVIDENCE:
${evidenceBlocks || "(no vector evidence)"}${incidentBlock}${lessonBlock}`;
}

async function parseAssetAndSymptoms(
  query: string
): Promise<{ asset: string; symptoms: string[] }> {
  const tagMatch = query.match(/\b[Pp]-?\d{2,4}\b|\b[A-Z]{1,3}-?\d{2,4}\b/);
  try {
    const result = await generateText({
      model: getChatModel("fast"),
      system:
        'Extract asset tag and symptom keywords. Return JSON: {"asset":"P-101","symptoms":["vibration","temperature"]}',
      prompt: query,
      maxOutputTokens: 120,
      temperature: 0,
    });
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        asset?: string;
        symptoms?: string[];
      };
      return {
        asset: parsed.asset ?? tagMatch?.[0] ?? "Unknown Asset",
        symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms.map(String) : [],
      };
    }
  } catch {}
  return {
    asset: tagMatch?.[0] ?? "Unknown Asset",
    symptoms: [],
  };
}

export async function generatePlaybook(query: string): Promise<OperationalPlaybook> {
  const { asset, symptoms } = await parseAssetAndSymptoms(query);
  const embedding = await embedSingle(query);

  const [chunks, graphIncidents, lessons] = await Promise.all([
    retrieveChunks(query, { topK: TOP_K, queryVector: embedding }),
    findSimilarIncidents(asset, symptoms),
    getLessonsForAsset(asset),
  ]);

  const filtered = chunks.filter((c) => c.score >= EVIDENCE_FLOOR);

  const result = await generateText({
    model: getChatModel("quality"),
    system: PLAYBOOK_SYSTEM,
    prompt: buildPrompt(query, filtered, graphIncidents, lessons),
    maxOutputTokens: 900,
    temperature: 0.1,
    maxRetries: 1,
  });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Playbook generation returned invalid JSON");
  }

  const parsed = PlaybookLLMSchema.parse(JSON.parse(jsonMatch[0]));
  const evidence = citationsFromIndices(filtered, parsed.evidenceIndices);

  const similarIncidents =
    graphIncidents.length > 0
      ? graphIncidents.map((inc) => ({
          id: inc.id,
          summary: inc.summary,
          date: inc.date,
        }))
      : parsed.lessonsLearned.length > 0
        ? [{ id: "From corpus", summary: parsed.issue, date: undefined }]
        : [];

  const avgScore =
    filtered.length > 0
      ? filtered.slice(0, 3).reduce((a, c) => a + c.score, 0) /
        Math.min(3, filtered.length)
      : 0;
  const confidenceBoost = graphIncidents.length > 0 ? 10 : 0;
  const confidenceScore = Math.min(
    99,
    Math.max(
      parsed.confidenceScore,
      Math.round(avgScore * 100) + confidenceBoost
    )
  );

  return {
    asset: parsed.asset,
    issue: parsed.issue,
    similarIncidents,
    mostCommonRootCause: parsed.mostCommonRootCause,
    previousSuccessfulResolution: parsed.previousSuccessfulResolution,
    lessonsLearned:
      parsed.lessonsLearned.length > 0
        ? parsed.lessonsLearned
        : lessons.map((l) => l.text).slice(0, 5),
    expertRecommendation: parsed.expertRecommendation,
    supportingEvidence: evidence.length > 0 ? evidence : filtered.slice(0, 4).map((c, i) => ({
      n: i + 1,
      fileName: c.fileName,
      page: c.pageOrSection,
      snippet: c.snippet,
      score: c.score,
    })),
    confidenceScore,
    generatedAt: new Date().toISOString(),
    query,
  };
}
