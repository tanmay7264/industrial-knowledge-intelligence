import { QdrantClient } from "@qdrant/js-client-rest";

// Reuse a single client instance across hot-reloads in development
const g = global as unknown as { _qdrant?: QdrantClient };

function createClient(): QdrantClient {
  const url = process.env.QDRANT_URL ?? "http://localhost:6333";
  const apiKey = process.env.QDRANT_API_KEY || undefined;
  return new QdrantClient({ url, ...(apiKey ? { apiKey } : {}) });
}

export const qdrant: QdrantClient = g._qdrant ?? createClient();

if (process.env.NODE_ENV !== "production") {
  g._qdrant = qdrant;
}
