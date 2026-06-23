import { embedSingle } from "@/lib/ai/embeddings";
import { qdrant } from "@/lib/clients/qdrant";
import { COLLECTION } from "@/lib/ingest/qdrant-store";

export interface RetrievedChunk {
  id: string;
  score: number;
  text: string;
  fileName: string;
  pageOrSection: number | string;
  docType: string;
  chunkIndex: number;
  snippet: string;
}

export interface RetrieveOptions {
  topK?: number;
  docTypeFilter?: string;
}

export async function retrieveChunks(
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const { topK = 8, docTypeFilter } = options;

  const queryVector = await embedSingle(query);

  const filter = docTypeFilter
    ? { must: [{ key: "docType", match: { value: docTypeFilter } }] }
    : undefined;

  const results = await qdrant.search(COLLECTION, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
    with_vector: false,
    ...(filter ? { filter } : {}),
  });

  return results.map((hit) => {
    const p = (hit.payload ?? {}) as Record<string, unknown>;
    const text = String(p.text ?? "");
    return {
      id: String(hit.id),
      score: hit.score,
      text,
      fileName: String(p.fileName ?? "Unknown"),
      pageOrSection: (p.pageOrSection as number | string) ?? 0,
      docType: String(p.docType ?? "unknown"),
      chunkIndex: Number(p.chunkIndex ?? 0),
      snippet: text.slice(0, 400).replace(/\s+/g, " ").trim(),
    };
  });
}
