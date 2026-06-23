import { v5 as uuidv5 } from "uuid";
import type { LoaderResult, Chunk, ChunkMetadata } from "./types";

// ~800 tokens at 4 chars/token; 120-token overlap
const CHUNK_CHARS = 3_200;
const OVERLAP_CHARS = 480;

// Stable namespace for deterministic chunk IDs
const IKI_NAMESPACE = "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f";

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}

function buildRawChunks(text: string): string[] {
  const paragraphs = splitParagraphs(text);
  const chunks: string[] = [];
  let current = "";
  let tailOverlap = "";

  for (const para of paragraphs) {
    const separator = current.length > 0 ? "\n\n" : "";
    const candidate = current + separator + para;

    if (candidate.length > CHUNK_CHARS && current.length > 0) {
      chunks.push(current.trim());
      // Carry the tail of the previous chunk into the next one
      tailOverlap = current.slice(-OVERLAP_CHARS).trimStart();
      current = tailOverlap + "\n\n" + para;
    } else {
      current = candidate;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 0);
}

export function chunkDocument(
  pages: LoaderResult[],
  docId: string,
  fileHash: string
): Chunk[] {
  const allChunks: Chunk[] = [];

  for (const page of pages) {
    const rawChunks = buildRawChunks(page.text);

    for (let i = 0; i < rawChunks.length; i++) {
      const text = rawChunks[i];
      const chunkKey = `${fileHash}-p${page.pageOrSection}-c${i}`;
      const id = uuidv5(chunkKey, IKI_NAMESPACE);

      const metadata: ChunkMetadata = {
        docId,
        docType: page.sourceMeta.fileType,
        fileName: page.sourceMeta.fileName,
        pageOrSection: page.pageOrSection,
        ingestedAt: new Date().toISOString(),
        chunkIndex: allChunks.length,
        totalChunks: 0, // backfilled below
        fileHash,
      };

      allChunks.push({ id, text, metadata });
    }
  }

  // Backfill totalChunks now that the full count is known
  const total = allChunks.length;
  for (const chunk of allChunks) {
    chunk.metadata.totalChunks = total;
  }

  return allChunks;
}
