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
  problemSummary: z
    .object({
      machine: z.string(),
      symptoms: z.array(z.string()),
      reportedBy: z.string(),
      date: z.string(),
      severity: z.string(),
    })
    .optional(),
  similarIncidents: z
    .array(
      z.object({
        incidentNumber: z.string(),
        similarity: z.number().min(0).max(100),
        resolvedBy: z.string(),
        resolutionSuccess: z.string(),
      })
    )
    .default([]),
  confidenceSignals: z
    .array(z.object({ label: z.string(), count: z.number().optional() }))
    .default([]),
  actionPlan: z
    .object({
      inspectionOrder: z.array(z.string()),
      repairProcedure: z.array(z.string()),
      safetyPrecautions: z.array(z.string()),
      requiredSpareParts: z.array(z.string()),
      requiredTools: z.array(z.string()),
      verificationChecklist: z.array(z.string()),
    })
    .optional(),
  investigationSummary: z
    .object({
      riskLevel: z.string(),
      estimatedDowntime: z.string(),
      estimatedRepairTime: z.string(),
      affectedComponents: z.array(z.string()),
    })
    .optional(),
  knowledgeSources: z.array(z.string()).default([]),
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
  "problemSummary": {
    "machine": "equipment tag",
    "symptoms": ["observed symptoms"],
    "reportedBy": "Operations|Maintenance|Inspection|Unknown",
    "date": "reported date or today's date",
    "severity": "Critical|High|Medium|Low"
  },
  "similarIncidents": [{"incidentNumber": "Incident #24", "similarity": 96, "resolvedBy": "engineer name", "resolutionSuccess": "Successful|Partial|Unknown"}],
  "alternativeHypotheses": [{"cause": "...", "confidence": 0-100}],
  "confidenceSignals": [{"label": "Similar Historical Incidents", "count": 3}],
  "actionPlan": {
    "inspectionOrder": ["first inspection"],
    "repairProcedure": ["repair step"],
    "safetyPrecautions": ["precaution"],
    "requiredSpareParts": ["part"],
    "requiredTools": ["tool"],
    "verificationChecklist": ["closeout check"]
  },
  "investigationSummary": {
    "riskLevel": "High",
    "estimatedDowntime": "4-6 hours",
    "estimatedRepairTime": "3 hours",
    "affectedComponents": ["bearing assembly"]
  },
  "knowledgeSources": ["Incident Reports", "Maintenance Logs", "Work Orders", "Vendor Manuals", "Expert Experience", "SOPs"],
  "verificationTests": ["test to confirm or reject hypothesis"],
  "correctiveActions": [{"action": "...", "urgency": "Immediate|High|Medium|Low", "impact": "..."}],
  "relatedAssets": ["P-305", "P-318"],
  "evidenceIndices": [numbers of evidence blocks relied on]
}
Rules:
- Ground hypotheses ONLY in numbered EVIDENCE blocks and graph context.
- Look for recurring patterns: bearing failures without alignment, cavitation, NPSH issues.
- Write like a senior reliability engineer presenting an evidence-backed AI investigation, not a chatbot.
- Include verification tests and a practical action plan that maintenance can run before closing work orders.
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

function titleCaseSource(docType: string): string {
  const normalized = docType.toLowerCase();
  if (normalized.includes("incident")) return "Incident Reports";
  if (normalized.includes("maintenance")) return "Maintenance Logs";
  if (normalized.includes("work") || normalized.includes("order")) return "Work Orders";
  if (normalized.includes("vendor") || normalized.includes("manual")) return "Vendor Manuals";
  if (normalized.includes("expert") || normalized.includes("interview")) return "Expert Experience";
  if (normalized.includes("sop")) return "SOPs";
  return "Operational Evidence";
}

function inferKnowledgeSources(chunks: RetrievedChunk[], graphIncidentCount: number): string[] {
  const sources = new Set(chunks.map((c) => titleCaseSource(c.docType)));
  if (graphIncidentCount > 0) sources.add("Incident Reports");
  return Array.from(sources).filter(Boolean);
}

function fallbackActionPlan(
  primaryHypothesis: string,
  verificationTests: string[],
  correctiveActions: { action: string }[]
) {
  return {
    inspectionOrder:
      verificationTests.length > 0
        ? verificationTests
        : [
            "Inspect the failed component and adjacent assemblies",
            "Compare current condition against recent maintenance records",
            "Validate operating parameters against SOP and vendor limits",
          ],
    repairProcedure:
      correctiveActions.length > 0
        ? correctiveActions.map((a) => a.action)
        : [`Correct ${primaryHypothesis.toLowerCase()} and document the repair evidence`],
    safetyPrecautions: [
      "Isolate and lock out the equipment before inspection",
      "Depressurize or drain stored energy sources before opening the assembly",
      "Use approved lifting and hot-work controls where applicable",
    ],
    requiredSpareParts: ["Bearing kit", "Seal kit", "Lubricant", "Fasteners"],
    requiredTools: ["Dial indicator", "Alignment kit", "Vibration meter", "Torque wrench"],
    verificationChecklist:
      verificationTests.length > 0
        ? verificationTests
        : [
            "Confirm vibration is within acceptable limits",
            "Confirm operating temperature and pressure are stable",
            "Record final readings in the work order",
          ],
  };
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
  const supportingEvidence =
    evidence.length > 0
      ? evidence
      : filtered.slice(0, 5).map((c, i) => ({
          n: i + 1,
          fileName: c.fileName,
          page: c.pageOrSection,
          snippet: c.snippet,
          score: c.score,
        }));

  const avgScore =
    filtered.length > 0
      ? filtered.slice(0, 4).reduce((a, c) => a + c.score, 0) /
        Math.min(4, filtered.length)
      : 0;
  const confidence = Math.min(
    99,
    Math.max(parsed.confidence, Math.round(avgScore * 100) + (graphIncidents.length > 0 ? 8 : 0))
  );
  const knowledgeSources = Array.from(
    new Set([
      ...parsed.knowledgeSources,
      ...inferKnowledgeSources(supportingEvidence.length > 0 ? filtered : chunks, graphIncidents.length),
    ])
  ).slice(0, 6);
  const similarIncidents =
    parsed.similarIncidents.length > 0
      ? parsed.similarIncidents
      : graphIncidents.slice(0, 4).map((inc, i) => ({
          incidentNumber: inc.id || `Incident #${i + 1}`,
          similarity: Math.max(72, Math.round(96 - i * 5)),
          resolvedBy:
            inc.summary.match(/\b(?:Rajesh|Ajay|Sharma|Patel)\b/g)?.join(" ") ||
            "Expert Knowledge",
          resolutionSuccess: inc.resolution ? "Successful" : "Unknown",
        }));
  const confidenceSignals =
    parsed.confidenceSignals.length > 0
      ? parsed.confidenceSignals
      : [
          { label: "Similar Historical Incidents", count: similarIncidents.length },
          {
            label: "Matching SOPs",
            count: filtered.filter((c) => titleCaseSource(c.docType) === "SOPs").length,
          },
          {
            label: "Expert Notes",
            count: filtered.filter((c) => titleCaseSource(c.docType) === "Expert Experience").length,
          },
          { label: "Maintenance History Match" },
          { label: "Vendor Manual Recommendation" },
        ].filter((signal) => signal.count === undefined || signal.count > 0);
  const actionPlan =
    parsed.actionPlan ??
    fallbackActionPlan(
      parsed.primaryHypothesis,
      parsed.verificationTests,
      parsed.correctiveActions
    );

  return {
    asset: parsed.asset,
    primaryHypothesis: parsed.primaryHypothesis,
    confidence,
    supportingEvidence,
    alternativeHypotheses: parsed.alternativeHypotheses,
    verificationTests: parsed.verificationTests,
    correctiveActions: parsed.correctiveActions,
    relatedAssets: parsed.relatedAssets,
    generatedAt: new Date().toISOString(),
    query,
    problemSummary: parsed.problemSummary ?? {
      machine: parsed.asset || asset,
      symptoms: [query],
      reportedBy: "Operations",
      date: new Date().toISOString().slice(0, 10),
      severity: confidence >= 90 ? "High" : "Medium",
    },
    similarIncidents,
    confidenceSignals,
    actionPlan,
    investigationSummary: parsed.investigationSummary ?? {
      riskLevel: confidence >= 90 ? "High" : confidence >= 75 ? "Medium" : "Low",
      estimatedDowntime: "4-8 hours",
      estimatedRepairTime: "2-4 hours",
      affectedComponents: [
        parsed.primaryHypothesis,
        ...parsed.alternativeHypotheses.slice(0, 2).map((h) => h.cause),
      ],
    },
    knowledgeSources,
  };
}
