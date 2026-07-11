import { NextResponse } from "next/server";
import {
  getPlantOverview,
  getAssets,
  getAlerts,
  getActivityFeed,
  getAssetHealthSummary,
} from "@/lib/seed";
import { qdrant } from "@/lib/clients/qdrant";
import { COLLECTION } from "@/lib/ingest/qdrant-store";
import { countIncidents } from "@/lib/graph/retrieve";

export const runtime = "nodejs";

async function countDocuments(): Promise<number> {
  const docHashes = new Set<string>();
  try {
    let offset: string | number | Record<string, unknown> | undefined | null;
    let pages = 0;
    do {
      const res = await qdrant.scroll(COLLECTION, {
        limit: 256,
        with_payload: { include: ["fileHash", "fileName"] },
        with_vector: false,
        offset: offset ?? undefined,
      });
      for (const point of res.points) {
        const payload = (point.payload ?? {}) as Record<string, unknown>;
        const key = payload.fileHash ?? payload.fileName;
        if (key) docHashes.add(String(key));
      }
      offset = res.next_page_offset;
      pages++;
    } while (offset && pages < 50);
  } catch {
    // empty corpus
  }
  return docHashes.size;
}

export async function GET() {
  const [documents, incidentsIndexed, plant] = await Promise.all([
    countDocuments(),
    countIncidents().catch(() => 0),
    Promise.resolve(getPlantOverview()),
  ]);

  const assets = getAssets();
  const alerts = getAlerts({ status: "open" });
  const criticalCount = assets.filter((a) => a.status === "Critical").length;
  const healthSummary = getAssetHealthSummary();
  const activityFeed = getActivityFeed(8);
  const priorityAlerts = getAlerts({ status: "open" })
    .filter((a) => a.severity === "Critical" || a.severity === "High")
    .slice(0, 5);

  return NextResponse.json({
    plant,
    kpis: {
      documentsIndexed: documents,
      connectedAssets: assets.length,
      activeAlerts: alerts.length,
      criticalAssets: criticalCount,
      knowledgeQueriesToday: 47,
      avgSearchTimeSaved: 73,
      incidentsIndexed,
    },
    healthSummary,
    priorityAlerts,
    activityFeed,
  });
}
