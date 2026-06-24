import { z } from "zod";
import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { retrieveChunks } from "@/lib/rag/retrieve";
import { retrieveSubgraph } from "@/lib/graph/retrieve";
import { loadRequirements } from "./requirements";
import type { Requirement } from "./requirements";
import type { RetrievedChunk } from "@/lib/rag/retrieve";
import type {
  Verdict,
  EvidenceCitation,
  RequirementVerdict,
  ComplianceReport,
} from "./compliance-types";

export type {
  Verdict,
  EvidenceCitation,
  RequirementVerdict,
  ComplianceReport,
  AuditPackItem,
  AuditPack,
} from "./compliance-types";
export { buildAuditPack } from "./audit-pack";

// Retrieval / judging tuning
const TOP_K = 6;
const EVIDENCE_FLOOR = 0.3; // cosine similarity below this = no meaningful evidence
const MAX_CONCURRENCY = 3;

// ---- Output validation -------------------------------------------------------

const JudgeSchema = z.object({
  verdict: z.enum(["COVERED", "PARTIAL", "GAP", "UNKNOWN"]),
  rationale: z.string().min(1),
  evidenceIndices: z.array(z.number().int()).default([]),
});

const VerdictSchema: z.ZodType<RequirementVerdict> = z.object({
  requirementId: z.string(),
  requirementText: z.string(),
  source: z.string(),
  category: z.string(),
  verdict: z.enum(["COVERED", "PARTIAL", "GAP", "UNKNOWN"]),
  rationale: z.string(),
  evidence: z.array(
    z.object({
      n: z.number(),
      fileName: z.string(),
      page: z.union([z.number(), z.string()]),
      snippet: z.string(),
      score: z.number(),
    })
  ),
  topScore: z.number(),
});

const ReportSchema = z.object({
  generatedAt: z.string(),
  totalRequirements: z.number(),
  summary: z.object({
    COVERED: z.number(),
    PARTIAL: z.number(),
    GAP: z.number(),
    UNKNOWN: z.number(),
  }),
  results: z.array(VerdictSchema),
});

// ---- Prompt ------------------------------------------------------------------

const JUDGE_SYSTEM = `You are a refinery compliance auditor. You assess whether a regulatory REQUIREMENT is satisfied by the EVIDENCE retrieved from a company's document corpus.

Return ONLY a JSON object — no markdown, no commentary:
{
  "verdict": "COVERED" | "PARTIAL" | "GAP" | "UNKNOWN",
  "rationale": "one or two sentences grounded strictly in the evidence",
  "evidenceIndices": [list of evidence numbers you relied on]
}

VERDICT DEFINITIONS — be conservative and evidence-driven:
- COVERED: the evidence explicitly and fully demonstrates the requirement is met. You MUST cite the supporting evidence numbers.
- PARTIAL: the evidence shows the requirement is addressed but with missing elements, weaker thresholds, or incomplete scope. You MUST cite evidence numbers.
- GAP: the evidence is on-topic and clearly shows the requirement is NOT met, contradicted, or that a mandated control is absent. You MUST cite the evidence you examined.
- UNKNOWN: the evidence is irrelevant, off-topic, or insufficient to judge. Use this whenever you cannot point to concrete supporting text.

CRITICAL RULES:
1. Never claim COVERED, PARTIAL, or GAP without citing at least one evidence number.
2. Do NOT infer compliance from absence of evidence. If nothing relevant is present, the verdict is UNKNOWN — not GAP.
3. Quote or paraphrase only what is in the evidence. Never invent standards, numbers, or facts.
4. A wrong GAP or COVERED claim is worse than an honest UNKNOWN. When in doubt, choose UNKNOWN.`;

function buildJudgePrompt(req: Requirement, chunks: RetrievedChunk[], graphContext: string): string {
  const evidenceBlocks = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.fileName}, section ${c.pageOrSection}, similarity ${c.score.toFixed(2)})\n${c.text.slice(0, 700)}`
    )
    .join("\n\n---\n\n");

  const graphSection = graphContext ? `\n\nRELATIONSHIP CONTEXT:\n${graphContext}` : "";

  return `REQUIREMENT (${req.id}, ${req.source}):
${req.requirementText}

EVIDENCE:
${evidenceBlocks}${graphSection}`;
}

// ---- JSON parse + repair -----------------------------------------------------

function extractJsonObject(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}

async function judgeWithRepair(
  prompt: string,
  attempt: "first" | "repair" = "first"
): Promise<z.infer<typeof JudgeSchema> | null> {
  try {
    const result = await generateText({
      model: getChatModel("quality"),
      system: JUDGE_SYSTEM,
      prompt,
      maxOutputTokens: 500,
      temperature: 0,
    });
    try {
      return JudgeSchema.parse(JSON.parse(extractJsonObject(result.text)));
    } catch {
      if (attempt === "repair") return null;
      const fixed = await generateText({
        model: getChatModel("fast"),
        system:
          'Fix this into valid JSON matching {"verdict","rationale","evidenceIndices"}. Return ONLY JSON.',
        prompt: result.text,
        maxOutputTokens: 400,
      });
      try {
        return JudgeSchema.parse(JSON.parse(extractJsonObject(fixed.text)));
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
}

// ---- Conservative post-processing -------------------------------------------

function citationsFromIndices(
  indices: number[],
  chunks: RetrievedChunk[]
): EvidenceCitation[] {
  const seen = new Set<number>();
  const out: EvidenceCitation[] = [];
  for (const idx of indices) {
    const chunk = chunks[idx - 1];
    if (!chunk || seen.has(idx)) continue;
    seen.add(idx);
    out.push({
      n: idx,
      fileName: chunk.fileName,
      page: chunk.pageOrSection,
      snippet: chunk.snippet,
      score: chunk.score,
    });
  }
  return out;
}

async function evaluateRequirement(req: Requirement): Promise<RequirementVerdict> {
  const base = {
    requirementId: req.id,
    requirementText: req.requirementText,
    source: req.source,
    category: req.category,
  };

  let chunks: RetrievedChunk[] = [];
  try {
    chunks = await retrieveChunks(req.requirementText, { topK: TOP_K });
  } catch {
    return {
      ...base,
      verdict: "UNKNOWN",
      rationale: "Evidence retrieval failed; unable to assess this requirement.",
      evidence: [],
      topScore: 0,
    };
  }

  const topScore = chunks.length ? Math.max(...chunks.map((c) => c.score)) : 0;

  // No meaningful evidence in the corpus — abstain rather than claim a gap.
  if (chunks.length === 0 || topScore < EVIDENCE_FLOOR) {
    return {
      ...base,
      verdict: "UNKNOWN",
      rationale:
        "No sufficiently relevant evidence was found in the corpus to assess this requirement.",
      evidence: [],
      topScore,
    };
  }

  // Best-effort relationship context; never block on graph availability.
  let graphContext = "";
  try {
    const sg = await retrieveSubgraph(req.requirementText);
    graphContext = sg.textContext;
  } catch {
    graphContext = "";
  }

  const judged = await judgeWithRepair(buildJudgePrompt(req, chunks, graphContext));

  if (!judged) {
    return {
      ...base,
      verdict: "UNKNOWN",
      rationale: "The compliance model did not return a valid assessment.",
      evidence: [],
      topScore,
    };
  }

  const evidence = citationsFromIndices(judged.evidenceIndices, chunks);

  // Conservatism guard: any non-UNKNOWN verdict must be backed by cited evidence.
  if (judged.verdict !== "UNKNOWN" && evidence.length === 0) {
    return {
      ...base,
      verdict: "UNKNOWN",
      rationale:
        `Model proposed ${judged.verdict} but cited no evidence; downgraded to UNKNOWN. ${judged.rationale}`.trim(),
      evidence: [],
      topScore,
    };
  }

  return {
    ...base,
    verdict: judged.verdict,
    rationale: judged.rationale,
    evidence,
    topScore,
  };
}

// ---- Bounded-concurrency driver ---------------------------------------------

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

export async function runComplianceScan(): Promise<ComplianceReport> {
  const requirements = loadRequirements();

  const results = await mapWithConcurrency(
    requirements,
    MAX_CONCURRENCY,
    evaluateRequirement
  );

  const summary: Record<Verdict, number> = {
    COVERED: 0,
    PARTIAL: 0,
    GAP: 0,
    UNKNOWN: 0,
  };
  for (const r of results) summary[r.verdict]++;

  const report: ComplianceReport = {
    generatedAt: new Date().toISOString(),
    totalRequirements: requirements.length,
    summary,
    results,
  };

  return ReportSchema.parse(report);
}
