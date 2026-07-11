import { streamText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { embedSingle } from "@/lib/ai/embeddings";
import { computeConfidence } from "@/lib/rag/answer";
import { cacheGet, cacheSet } from "@/lib/rag/cache";
import { routedRetrieve, routeAndExtract } from "@/lib/rag/router";
import type { RetrievalMode } from "@/lib/rag/router";
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

  // Embedding and retrieval hit external providers (Jina, Qdrant) that can be
  // rate-limited or briefly unavailable. If any of that fails, return a clear
  // message the UI can render instead of a blank 500 that freezes the bubble.
  let queryEmbedding: number[];
  let mode: RetrievalMode;
  let subgraph: Awaited<ReturnType<typeof routedRetrieve>>["subgraph"];
  let systemPrompt: string;
  let sources: Awaited<ReturnType<typeof routedRetrieve>>["sources"];
  let scores: number[];

  try {
    // Embed the query (needed for the semantic cache) and route it (classify +
    // extract entities) at the same time — neither depends on the other.
    const embeddingPromise = embedSingle(query);
    const routePromise = routeAndExtract(query);

    queryEmbedding = await embeddingPromise;
    const cached = cacheGet(queryEmbedding);

    if (cached) {
      return Response.json({
        ...cached,
        cached: true,
        latencyMs: Date.now() - startMs,
      });
    }

    const route = await routePromise;
    mode = route.mode;
    const ctx = await routedRetrieve(
      query,
      queryEmbedding,
      route.mode,
      route.entities,
      docTypeFilter
    );
    ({ subgraph, systemPrompt, sources, scores } = ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const rateLimited = /rate limit|tokens per minute|429|too many requests/i.test(
      message
    );
    return Response.json({
      answer: rateLimited
        ? "⚠️ The service is busy right now (rate limit). Please wait a few seconds and ask again."
        : "⚠️ Couldn't reach the knowledge base. Please check the connection and try again.",
      sources: [],
      confidence: "Low",
      abstained: false,
      error: true,
      latencyMs: Date.now() - startMs,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encode("meta", {
          sources,
          subgraph: subgraph && subgraph.nodes.length > 0 ? subgraph : null,
          mode,
        })
      );

      let fullText = "";
      let generationFailed = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        fullText = "";
        generationFailed = false;
        try {
          const result = streamText({
            model: getChatModel("quality"),
            system: systemPrompt,
            prompt: query,
            maxOutputTokens: 1024,
            temperature: 0.1,
            // Fail fast instead of waiting out the provider's retry-after backoff —
            // a clear "try again" beats a frozen UI during a live demo.
            maxRetries: 0,
          });

          for await (const chunk of result.textStream) {
            fullText += chunk;
            controller.enqueue(encode("text", { chunk }));
          }
          if (fullText.trim()) break;
        } catch (err) {
          generationFailed = true;
          const message = err instanceof Error ? err.message : "";
          const rateLimited = /rate limit|tokens per minute|429/i.test(message);
          const note = rateLimited
            ? "⚠️ The language model is busy right now (rate limit). Please wait a few seconds and ask again."
            : "⚠️ Something went wrong generating the answer. Please try again.";
          if (attempt === 1) {
            const chunk = fullText ? `\n\n${note}` : note;
            fullText += chunk;
            controller.enqueue(encode("text", { chunk }));
            break;
          }
        }
        // Brief pause before retrying an empty or failed generation.
        if (attempt === 0 && !fullText.trim()) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      // The provider can also end the stream with no tokens and no error when it
      // is overloaded. Treat an empty answer as a failure so we surface a retry
      // message and never cache a blank response.
      if (!generationFailed && !fullText.trim()) {
        generationFailed = true;
        fullText =
          "⚠️ The language model returned no answer (it may be busy). Please try again in a few seconds.";
        controller.enqueue(encode("text", { chunk: fullText }));
      }

      const abstained =
        fullText.trim().toLowerCase().startsWith("not found in the knowledge base") ||
        fullText.trim().toLowerCase().includes("not found in the knowledge base");

      const hasGraphEvidence = !!(subgraph && subgraph.nodes.length > 0);
      const confidence: ConfidenceLevel = computeConfidence(
        scores,
        abstained,
        hasGraphEvidence
      );
      const latencyMs = Date.now() - startMs;

      controller.enqueue(encode("done", { confidence, latencyMs, abstained, mode }));

      // Never cache a failed generation — the next identical query should retry.
      if (!generationFailed) {
        const answer: ChatAnswer = {
          answer: fullText,
          sources,
          confidence,
          abstained,
        };
        cacheSet(queryEmbedding, answer);
      }

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
