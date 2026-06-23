import { qdrant } from "@/lib/clients/qdrant";
import type { ChunkWithEntities } from "./types";

export const COLLECTION = "iki_chunks";
const VECTOR_SIZE = 768;
const UPSERT_BATCH = 100;

export async function ensureCollection(): Promise<void> {
  const { collections } = await qdrant.getCollections();
  const exists = collections.some((c) => c.name === COLLECTION);

  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
  }
}

export async function deleteByFileHash(fileHash: string): Promise<void> {
  try {
    await qdrant.delete(COLLECTION, {
      filter: {
        must: [{ key: "fileHash", match: { value: fileHash } }],
      },
    });
  } catch {
    // Collection may be empty or filter matched nothing — both are fine
  }
}

export async function countByFileHash(fileHash: string): Promise<number> {
  try {
    const result = await qdrant.scroll(COLLECTION, {
      filter: {
        must: [{ key: "fileHash", match: { value: fileHash } }],
      },
      limit: 1,
      with_payload: false,
      with_vector: false,
    });
    return result.points.length;
  } catch {
    return 0;
  }
}

export async function upsertChunks(
  chunks: ChunkWithEntities[],
  vectors: number[][]
): Promise<void> {
  const points = chunks.map((chunk, i) => ({
    id: chunk.id,
    vector: vectors[i],
    payload: {
      text: chunk.text,
      ...chunk.metadata,
      entities: chunk.entities,
    },
  }));

  for (let i = 0; i < points.length; i += UPSERT_BATCH) {
    await qdrant.upsert(COLLECTION, {
      wait: true,
      points: points.slice(i, i + UPSERT_BATCH),
    });
  }
}
