import { NextResponse } from "next/server";
import {
  getAsset,
  getTimeline,
  getAlerts,
} from "@/lib/seed";
import { findSimilarIncidents, getLessonsForAsset } from "@/lib/graph/retrieve";
import { qdrant } from "@/lib/clients/qdrant";
import { COLLECTION } from "@/lib/ingest/qdrant-store";

export const runtime = "nodejs";

async function getRelatedDocuments(tag: string): Promise<
  { fileName: string; docType?: string }[]
> {
  const docs = new Map<string, { fileName: string; docType?: string }>();
  try {
    let offset: string | number | Record<string, unknown> | undefined | null;
    let pages = 0;
    do {
      const res = await qdrant.scroll(COLLECTION, {
        limit: 128,
        with_payload: { include: ["fileName", "equipmentTags", "docType"] },
        with_vector: false,
        offset: offset ?? undefined,
      });
      for (const point of res.points) {
        const payload = (point.payload ?? {}) as Record<string, unknown>;
        const tags = (payload.equipmentTags as string[] | undefined) ?? [];
        const fileName = String(payload.fileName ?? "");
        if (
          tags.some((t) => t.toLowerCase().includes(tag.toLowerCase())) ||
          fileName.toLowerCase().includes(tag.toLowerCase())
        ) {
          docs.set(fileName, {
            fileName,
            docType: payload.docType as string | undefined,
          });
        }
      }
      offset = res.next_page_offset;
      pages++;
    } while (offset && pages < 20);
  } catch {
    // collection may not exist
  }
  return [...docs.values()].slice(0, 20);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
  const asset = getAsset(tag);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const [timeline, alerts, similarIncidents, lessons, documents] =
    await Promise.all([
      Promise.resolve(getTimeline(tag)),
      Promise.resolve(getAlerts({ assetTag: tag })),
      findSimilarIncidents(tag).catch(() => []),
      getLessonsForAsset(tag).catch(() => []),
      getRelatedDocuments(tag),
    ]);

  return NextResponse.json({
    asset,
    timeline,
    alerts,
    similarIncidents,
    lessons,
    documents,
    aiSummary: `Operational history for ${asset.tag}: ${timeline.length} timeline events, ${alerts.length} active alerts, ${documents.length} related documents indexed.`,
  });
}
