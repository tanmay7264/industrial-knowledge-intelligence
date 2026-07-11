import { NextRequest, NextResponse } from "next/server";
import { ingestFile } from "@/lib/ingest/pipeline";
import { deleteByFileHash } from "@/lib/ingest/qdrant-store";
import { deleteDocumentGraph } from "@/lib/graph/build";
import type { IngestResult } from "@/lib/ingest/types";

export const maxDuration = 300; // allow long-running ingestion (Vercel: 5 min)

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results: IngestResult[] = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return ingestFile(buffer, file.name);
    })
  );

  const allOk = results.every((r) => r.status === "success");

  return NextResponse.json(
    { results },
    { status: allOk ? 200 : 207 } // 207 Multi-Status when some failed
  );
}

// Removes a previously ingested file from both the vector store and the
// knowledge graph — the "Delete" side of the save/delete decision on the
// Ingest page.
export async function DELETE(request: NextRequest) {
  let body: { fileHash?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fileHash } = body;
  if (!fileHash) {
    return NextResponse.json({ error: "fileHash is required" }, { status: 400 });
  }

  await deleteByFileHash(fileHash);
  try {
    await deleteDocumentGraph(fileHash);
  } catch {
    // Graph unavailable — vector store removal already succeeded
  }

  return NextResponse.json({ deleted: true });
}
