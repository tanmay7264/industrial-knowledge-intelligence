const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-embeddings-v2-base-en";

// Dimensions for jina-embeddings-v2-base-en and nomic-embed-text
export const EMBEDDING_DIMENSIONS = 768;

interface JinaResponse {
  data: { embedding: number[] }[];
}

interface OllamaEmbedResponse {
  embedding: number[];
}

async function jinaEmbed(texts: string[]): Promise<number[][]> {
  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: JINA_MODEL }),
  });

  if (!res.ok) {
    throw new Error(`Jina embeddings error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as JinaResponse;
  return json.data.map((item) => item.embedding);
}

async function ollamaEmbed(texts: string[]): Promise<number[][]> {
  const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const url = `${baseURL}/api/embeddings`;

  return Promise.all(
    texts.map(async (text) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
      });

      if (!res.ok) {
        throw new Error(`Ollama embed error: ${res.status} ${res.statusText}`);
      }

      const json = (await res.json()) as OllamaEmbedResponse;
      return json.embedding;
    })
  );
}

/**
 * Embeds a batch of strings.
 * Uses Jina AI when JINA_API_KEY is set; falls back to Ollama nomic-embed-text.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (process.env.JINA_API_KEY) {
    return jinaEmbed(texts);
  }
  return ollamaEmbed(texts);
}

export async function embedSingle(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text]);
  return embedding;
}
