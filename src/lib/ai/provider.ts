import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Groq open models — fast tier for routing/extraction, quality tier for synthesis
const GROQ_FAST_MODEL = "llama-3.1-8b-instant";
const GROQ_QUALITY_MODEL = "llama-3.3-70b-versatile";

function groqModel(speed: "fast" | "quality"): LanguageModel {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required when LLM_PROVIDER=groq");
  }
  const groq = createGroq({ apiKey });
  return groq(speed === "fast" ? GROQ_FAST_MODEL : GROQ_QUALITY_MODEL);
}

// Ollama exposes an OpenAI-compatible API — no extra package needed
function ollamaModel(speed: "fast" | "quality"): LanguageModel {
  const baseURL = `${process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}/v1`;
  const provider = createOpenAI({ baseURL, apiKey: "ollama" });
  const model = speed === "fast" ? "llama3.2:3b" : "llama3.1:8b";
  return provider(model);
}

function hostedModel(): LanguageModel {
  const baseURL = process.env.HOSTED_BASE_URL;
  if (!baseURL) {
    throw new Error("HOSTED_BASE_URL is required when LLM_PROVIDER=hosted");
  }
  const provider = createOpenAI({
    baseURL,
    apiKey: process.env.HOSTED_API_KEY ?? "",
  });
  return provider(process.env.HOSTED_MODEL ?? "gpt-4o-mini");
}

/**
 * Returns a language model for the configured provider.
 *
 * speed="fast"    → llama-3.1-8b-instant  (query routing, entity extraction)
 * speed="quality" → llama-3.3-70b-versatile (answer synthesis, compliance reasoning)
 *
 * Configured via LLM_PROVIDER env var: "groq" (default) | "ollama" | "hosted"
 */
export function getChatModel(speed: "fast" | "quality" = "quality"): LanguageModel {
  const providerName = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();

  switch (providerName) {
    case "groq":
      return groqModel(speed);
    case "ollama":
      return ollamaModel(speed);
    case "hosted":
      return hostedModel();
    default:
      throw new Error(
        `Unknown LLM_PROVIDER: "${providerName}". Valid values: groq | ollama | hosted`
      );
  }
}
