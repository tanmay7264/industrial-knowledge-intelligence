import { NextRequest, NextResponse } from "next/server";
import { ingestFile } from "@/lib/ingest/pipeline";
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
