import "./load-env";
import * as fs from "fs";
import * as path from "path";
import { ingestFile } from "../src/lib/ingest/pipeline";

const SAMPLE_DIR = path.join(process.cwd(), "sample-docs");
const SUPPORTED = new Set(["pdf", "png", "jpg", "jpeg", "tiff", "xlsx", "csv", "eml", "txt"]);

function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function looksPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith("your_") || value.length < 12;
}

function preflightCredentials() {
  const provider = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
  const problems: string[] = [];

  if (provider === "groq" && looksPlaceholder(process.env.GROQ_API_KEY)) {
    problems.push("GROQ_API_KEY (entity extraction)");
  }
  if (looksPlaceholder(process.env.JINA_API_KEY) && !process.env.OLLAMA_BASE_URL) {
    problems.push("JINA_API_KEY (embeddings) — or set OLLAMA_BASE_URL for local embeddings");
  }

  if (problems.length > 0) {
    console.error("\nMissing or placeholder credentials in .env.local:");
    for (const p of problems) console.error(`  - ${p}`);
    console.error(
      "\nSet real keys in .env.local and re-run `npm run seed`. Seeding requires a model provider and an embedding provider.\n"
    );
    process.exit(1);
  }
}

async function seed() {
  preflightCredentials();

  if (!fs.existsSync(SAMPLE_DIR)) {
    fs.mkdirSync(SAMPLE_DIR, { recursive: true });
    console.log("Created sample-docs/. Add files and re-run.");
    return;
  }

  const files = fs
    .readdirSync(SAMPLE_DIR)
    .filter((f) => SUPPORTED.has(getExt(f)));

  if (files.length === 0) {
    console.log("No supported files in sample-docs/. Nothing to ingest.");
    return;
  }

  console.log(`Ingesting ${files.length} file(s) from sample-docs/...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(SAMPLE_DIR, file);
    const buffer = fs.readFileSync(filePath);

    process.stdout.write(`  ${file.padEnd(40)} `);

    const result = await ingestFile(buffer, file);

    if (result.status === "success" || result.status === "partial") {
      const totalEntities = Object.values(result.entitiesFound).reduce(
        (a, b) => a + b,
        0
      );
      const flags = [
        result.ocrApplied ? "OCR" : "",
        result.status === "partial" ? "partial" : "",
      ]
        .filter(Boolean)
        .join(", ");

      console.log(
        `✓  ${result.chunks} chunks  ${totalEntities} entities${flags ? `  [${flags}]` : ""}`
      );
      successCount++;
    } else {
      console.log(`✗  ${result.error ?? "unknown error"}`);
      failCount++;
    }
  }

  console.log(
    `\nDone — ${successCount} succeeded, ${failCount} failed.`
  );
  console.log(
    "Vector store  → http://localhost:6333/dashboard#/collections/iki_chunks"
  );
  console.log("Knowledge graph → http://localhost:7474 (built inline during ingest)");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
