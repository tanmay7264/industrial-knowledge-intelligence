import { z } from "zod";
import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import type { Chunk, ChunkWithEntities, ExtractedEntities } from "./types";

const EntitySchema = z.object({
  equipmentTags: z.array(z.string()).default([]),
  processParameters: z.array(z.string()).default([]),
  regulatoryRefs: z.array(z.string()).default([]),
  personnel: z.array(z.string()).default([]),
  dates: z.array(z.string()).default([]),
  docType: z
    .enum([
      "SOP",
      "datasheet",
      "inspection_report",
      "email",
      "regulation",
      "manual",
      "spreadsheet",
      "other",
    ])
    .default("other"),
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
  "processParameters": ["temperatures, pressures, flow rates, concentrations, limits"],
  "regulatoryRefs": ["ISO, OSHA, API, ASME, EPA standards, CFR sections, permit numbers"],
  "personnel": ["names, job titles, departments, responsible parties"],
  "dates": ["dates, revision numbers, effective dates, inspection dates"],
  "docType": "one of: SOP | datasheet | inspection_report | email | regulation | manual | spreadsheet | other"
}`;

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

    // Ask the model to fix its own malformed output
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

const EXTRACTION_BATCH = 5;

export async function extractEntities(
  chunks: Chunk[]
): Promise<ChunkWithEntities[]> {
  const results: ChunkWithEntities[] = [];

  for (let i = 0; i < chunks.length; i += EXTRACTION_BATCH) {
    const batch = chunks.slice(i, i + EXTRACTION_BATCH);
    const extracted = await Promise.all(
      batch.map(async (chunk) => ({
        ...chunk,
        entities: await extractFromChunk(chunk.text),
      }))
    );
    results.push(...extracted);
  }

  return results;
}
