import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { loadDocument } from "./loaders";
import { chunkDocument } from "./chunk";
import { extractEntities } from "./entities";
import { embedBatch } from "@/lib/ai/embeddings";
import {
  ensureCollection,
  deleteByFileHash,
  upsertChunks,
} from "./qdrant-store";
import type { IngestResult, EntityCounts, ChunkWithEntities } from "./types";

const ZERO_COUNTS: EntityCounts = {
  equipmentTags: 0,
  processParameters: 0,
  regulatoryRefs: 0,
  personnel: 0,
  dates: 0,
};

function sumEntityCounts(chunks: ChunkWithEntities[]): EntityCounts {
  return chunks.reduce(
    (acc, c) => ({
      equipmentTags: acc.equipmentTags + c.entities.equipmentTags.length,
      processParameters:
        acc.processParameters + c.entities.processParameters.length,
      regulatoryRefs: acc.regulatoryRefs + c.entities.regulatoryRefs.length,
      personnel: acc.personnel + c.entities.personnel.length,
      dates: acc.dates + c.entities.dates.length,
    }),
    { ...ZERO_COUNTS }
  );
}

export async function ingestFile(
  buffer: Buffer,
  fileName: string
): Promise<IngestResult> {
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const docId = uuidv4();

  try {
    await ensureCollection();

    // Idempotency: wipe any previously ingested points for this file hash
    await deleteByFileHash(fileHash);

    // Load and parse the document
    const pages = await loadDocument(buffer, fileName);
    const ocrApplied = pages.some((p) => p.sourceMeta.ocrApplied === true);

    // Chunk across all pages/sections
    const chunks = chunkDocument(pages, docId, fileHash);

    if (chunks.length === 0) {
      return {
        fileName,
        fileHash,
        chunks: 0,
        entitiesFound: ZERO_COUNTS,
        ocrApplied,
        status: "partial",
        error: "No text could be extracted from document",
      };
    }

    // Entity extraction (LLM)
    const chunksWithEntities = await extractEntities(chunks);

    // Embed all chunk texts in one batched request
    const vectors = await embedBatch(chunksWithEntities.map((c) => c.text));

    // Store in Qdrant
    await upsertChunks(chunksWithEntities, vectors);

    return {
      fileName,
      fileHash,
      chunks: chunks.length,
      entitiesFound: sumEntityCounts(chunksWithEntities),
      ocrApplied,
      status: "success",
    };
  } catch (err) {
    return {
      fileName,
      fileHash,
      chunks: 0,
      entitiesFound: ZERO_COUNTS,
      ocrApplied: false,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
