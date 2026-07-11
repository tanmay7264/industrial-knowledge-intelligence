import { z } from "zod";
import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import type {
  Chunk,
  ChunkWithEntities,
  ExtractedEntities,
  RCARecord,
  SemanticDocType,
} from "./types";
import { RCA_DOC_TYPES } from "./types";

const DocTypeEnum = z.enum([
  "SOP",
  "datasheet",
  "inspection_report",
  "email",
  "regulation",
  "manual",
  "spreadsheet",
  "incident_report",
  "work_order",
  "expert_interview",
  "maintenance_log",
  "audit_report",
  "vendor_manual",
  "other",
]);

const EntitySchema = z.object({
  equipmentTags: z.array(z.string()).default([]),
  processParameters: z.array(z.string()).default([]),
  regulatoryRefs: z.array(z.string()).default([]),
  personnel: z.array(z.string()).default([]),
  dates: z.array(z.string()).default([]),
  docType: DocTypeEnum.default("other"),
});

const RCASchema = z.object({
  asset: z.string().optional(),
  symptoms: z.array(z.string()).default([]),
  failureMode: z.string().optional(),
  rootCause: z.string().optional(),
  resolution: z.string().optional(),
  outcome: z.string().optional(),
  lessonsLearned: z.array(z.string()).default([]),
  expertName: z.string().optional(),
  eventDate: z.string().optional(),
  incidentId: z.string().optional(),
});

const EMPTY_ENTITIES: ExtractedEntities = {
  equipmentTags: [],
  processParameters: [],
  regulatoryRefs: [],
  personnel: [],
  dates: [],
  docType: "other",
};

const SYSTEM_PROMPT = `You extract structured entities from industrial document chunks.
Return ONLY a valid JSON object with these exact keys — no markdown, no explanation:
{
  "equipmentTags": ["equipment IDs, tag numbers, P&ID tags, instrument tags"],
  "processParameters": ["temperatures, pressures, flow rates, concentrations, limits, vibration levels"],
  "regulatoryRefs": ["ISO, OSHA, API, ASME, EPA standards, CFR sections, permit numbers"],
  "personnel": ["names, job titles, departments, responsible parties"],
  "dates": ["dates, revision numbers, effective dates, inspection dates"],
  "docType": "one of: SOP | datasheet | inspection_report | email | regulation | manual | spreadsheet | incident_report | work_order | expert_interview | maintenance_log | audit_report | vendor_manual | other"
}`;

const RCA_SYSTEM = `You extract root-cause-analysis (RCA) fields from industrial incident, work order, expert interview, maintenance log, or audit documents.
Return ONLY valid JSON — no markdown:
{
  "asset": "primary equipment tag e.g. P-101",
  "symptoms": ["observable symptoms"],
  "failureMode": "failure mode description",
  "rootCause": "root cause",
  "resolution": "resolution or corrective action taken",
  "outcome": "resolved | ongoing | near_miss | open",
  "lessonsLearned": ["lessons learned strings"],
  "expertName": "expert or investigator name if present",
  "eventDate": "primary event date if present",
  "incidentId": "incident or work order ID if present e.g. INC-2024-P101"
}
Omit keys you cannot find. Use empty arrays for symptoms/lessonsLearned if none.`;

function extractJsonObject(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}

async function parseWithRepair(
  raw: string,
  attempt: "first" | "repair"
): Promise<ExtractedEntities | null> {
  try {
    const obj = JSON.parse(extractJsonObject(raw));
    return EntitySchema.parse(obj);
  } catch {
    if (attempt === "repair") return null;
    try {
      const fix = await generateText({
        model: getChatModel("fast"),
        system:
          "Fix the malformed JSON so it matches the schema. Return ONLY valid JSON, no explanation.",
        prompt: `Malformed output:\n${raw}\n\nRequired keys: equipmentTags, processParameters, regulatoryRefs, personnel, dates, docType`,
        maxOutputTokens: 512,
      });
      return parseWithRepair(fix.text, "repair");
    } catch {
      return null;
    }
  }
}

async function extractFromChunk(text: string): Promise<ExtractedEntities> {
  try {
    const result = await generateText({
      model: getChatModel("fast"),
      system: SYSTEM_PROMPT,
      prompt: `Extract entities from this industrial document chunk:\n\n${text.slice(0, 4_000)}`,
      maxOutputTokens: 600,
    });
    const parsed = await parseWithRepair(result.text, "first");
    return parsed ?? EMPTY_ENTITIES;
  } catch {
    return EMPTY_ENTITIES;
  }
}

async function extractRCA(
  text: string,
  docType: SemanticDocType
): Promise<RCARecord | undefined> {
  if (!RCA_DOC_TYPES.has(docType)) return undefined;
  try {
    const result = await generateText({
      model: getChatModel("fast"),
      system: RCA_SYSTEM,
      prompt: `Extract RCA fields from this document chunk (docType: ${docType}):\n\n${text.slice(0, 4_000)}`,
      maxOutputTokens: 600,
    });
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    const parsed = RCASchema.parse(JSON.parse(match[0]));
    const hasContent =
      parsed.asset ||
      parsed.failureMode ||
      parsed.rootCause ||
      parsed.symptoms.length > 0;
    return hasContent ? parsed : undefined;
  } catch {
    return undefined;
  }
}

const EXTRACTION_BATCH = 5;

export async function extractEntities(
  chunks: Chunk[]
): Promise<ChunkWithEntities[]> {
  const results: ChunkWithEntities[] = [];

  for (let i = 0; i < chunks.length; i += EXTRACTION_BATCH) {
    const batch = chunks.slice(i, i + EXTRACTION_BATCH);
    const extracted = await Promise.all(
      batch.map(async (chunk) => {
        const entities = await extractFromChunk(chunk.text);
        const rca = await extractRCA(chunk.text, entities.docType);
        return {
          ...chunk,
          entities: rca ? { ...entities, rca } : entities,
        };
      })
    );
    results.push(...extracted);
  }

  return results;
}
