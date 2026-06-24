import "./load-env";
import { QdrantClient } from "@qdrant/js-client-rest";
import { buildDocumentGraph } from "../src/lib/graph/build";
import type { ChunkWithEntities, ExtractedEntities, ChunkMetadata } from "../src/lib/ingest/types";

const COLLECTION = "iki_chunks";
const SCROLL_LIMIT = 100;

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6333",
  checkCompatibility: false,
});

interface QdrantPayload {
  text: string;
  docId: string;
  docType: string;
  fileName: string;
  fileHash: string;
  pageOrSection: string | number;
  ingestedAt: string;
  chunkIndex: number;
  totalChunks: number;
  entities: ExtractedEntities;
}

async function main() {
  console.log("Scanning Qdrant for existing chunks…\n");

  const docMap = new Map<string, ChunkWithEntities[]>();
  let offset: string | number | null = null;

  while (true) {
    const page = await qdrant.scroll(COLLECTION, {
      limit: SCROLL_LIMIT,
      with_payload: true,
      with_vector: false,
      ...(offset !== null ? { offset } : {}),
    });

    for (const point of page.points) {
      const p = point.payload as unknown as QdrantPayload;
      if (!p?.docId) continue;

      const chunk: ChunkWithEntities = {
        id: String(point.id),
        text: p.text ?? "",
        metadata: {
          docId: p.docId,
          docType: p.docType ?? "other",
          fileName: p.fileName ?? "",
          pageOrSection: p.pageOrSection ?? 0,
          ingestedAt: p.ingestedAt ?? new Date().toISOString(),
          chunkIndex: p.chunkIndex ?? 0,
          totalChunks: p.totalChunks ?? 1,
          fileHash: p.fileHash ?? "",
        } satisfies ChunkMetadata,
        entities: p.entities ?? {
          equipmentTags: [],
          processParameters: [],
          regulatoryRefs: [],
          personnel: [],
          dates: [],
          docType: "other",
        },
      };

      const existing = docMap.get(p.docId) ?? [];
      existing.push(chunk);
      docMap.set(p.docId, existing);
    }

    const nextOffset = page.next_page_offset;
    offset = typeof nextOffset === "string" || typeof nextOffset === "number" ? nextOffset : null;
    if (offset === null) break;
  }

  console.log(`Found ${docMap.size} document(s) across Qdrant.\n`);

  let ok = 0;
  let fail = 0;

  for (const [docId, chunks] of docMap) {
    const { fileName, fileHash } = chunks[0].metadata;
    process.stdout.write(`  ${fileName.padEnd(42)} `);
    try {
      await buildDocumentGraph(chunks, fileName, fileHash, docId);
      console.log(`✓  ${chunks.length} chunks → graph`);
      ok++;
    } catch (err) {
      console.log(`✗  ${err instanceof Error ? err.message : String(err)}`);
      fail++;
    }
  }

  console.log(`\nDone — ${ok} succeeded, ${fail} failed.`);
  console.log("Inspect graph → http://localhost:7474/browser/");
  process.exit(0);
}

main().catch((err) => {
  console.error("Build-graph failed:", err);
  process.exit(1);
});
