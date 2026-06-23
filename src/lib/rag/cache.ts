import { cosineSimilarity } from "ai";
import type { ChatAnswer } from "./answer";

const CACHE_CAPACITY = 50;
const SIMILARITY_THRESHOLD = 0.95;

interface CacheEntry {
  embedding: number[];
  answer: ChatAnswer;
}

const g = global as unknown as { _ragCache?: CacheEntry[] };
if (!g._ragCache) g._ragCache = [];
const entries: CacheEntry[] = g._ragCache;

export function cacheGet(queryEmbedding: number[]): ChatAnswer | null {
  for (const entry of entries) {
    if (cosineSimilarity(queryEmbedding, entry.embedding) >= SIMILARITY_THRESHOLD) {
      return entry.answer;
    }
  }
  return null;
}

export function cacheSet(embedding: number[], answer: ChatAnswer): void {
  if (entries.length >= CACHE_CAPACITY) {
    entries.shift();
  }
  entries.push({ embedding, answer });
}
