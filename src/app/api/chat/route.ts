import { streamText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { embedSingle } from "@/lib/ai/embeddings";
import { retrieveChunks } from "@/lib/rag/retrieve";
import {
  buildSystemPrompt,
  computeConfidence,
  sourcesFromChunks,
} from "@/lib/rag/answer";
import { cacheGet, cacheSet } from "@/lib/rag/cache";
import type { ChatAnswer, ConfidenceLevel } from "@/lib/rag/answer";

export const runtime = "nodejs";
export const maxDuration = 60;

function encode(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );
}

export async function POST(req: Request) {
  const { query, docTypeFilter } = (await req.json()) as {
    query: string;
    docTypeFilter?: string;
  };

  const startMs = Date.now();

  const queryEmbedding = await embedSingle(query);
  const cached = cacheGet(queryEmbedding);

  if (cached) {
    return Response.json({ ...cached, cached: true, latencyMs: Date.now() - startMs });
  }

  const chunks = await retrieveChunks(query, { docTypeFilter });
  const sources = sourcesFromChunks(chunks);
  const scores = chunks.map((c) => c.score);
  const systemPrompt = buildSystemPrompt(chunks);

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encode("meta", { sources }));

      let fullText = "";

      try {
        const result = streamText({
          model: getChatModel("quality"),
          system: systemPrompt,
          prompt: query,
          maxOutputTokens: 1024,
          temperature: 0.1,
        });

        for await (const chunk of result.textStream) {
          fullText += chunk;
          controller.enqueue(encode("text", { chunk }));
        }
      } catch {
        controller.enqueue(encode("error", { message: "Generation failed" }));
      }

      const abstained =
        fullText.trim().toLowerCase().startsWith("not found in the knowledge base") ||
        fullText.trim().toLowerCase().includes("not found in the knowledge base");

      const confidence: ConfidenceLevel = computeConfidence(scores, abstained);
      const latencyMs = Date.now() - startMs;

      controller.enqueue(encode("done", { confidence, latencyMs, abstained }));

      const answer: ChatAnswer = {
        answer: fullText,
        sources,
        confidence,
        abstained,
      };
      cacheSet(queryEmbedding, answer);

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
