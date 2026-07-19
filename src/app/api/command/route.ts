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
import { buildKnowledgeRiskReport } from "@/lib/agents/knowledge-risk";

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
  const [documents, incidentsIndexed, plant, riskReport] = await Promise.all([
    countDocuments(),
    countIncidents().catch(() => 0),
    Promise.resolve(getPlantOverview()),
    buildKnowledgeRiskReport().catch(() => null),
  ]);

  const assets = getAssets();
  const alerts = getAlerts({ status: "open" });
  const criticalCount = assets.filter((a) => a.status === "Critical").length;
  const healthSummary = getAssetHealthSummary();
  const activityFeed = getActivityFeed(8);
  // ALT-014 is the expert-retirement alert; it gets its own Knowledge Risk
  // card on Command Center instead of sitting in the general alert list.
  // ponytail: hardcoded id, promote to an alert `category` field if more
  // cross-cutting alerts like this show up.
  const priorityAlerts = getAlerts({ status: "open" })
    .filter((a) => a.severity === "Critical" || a.severity === "High")
    .filter((a) => a.id !== "ALT-014")
    .slice(0, 5);

  const topExpert = riskReport?.experts[0] ?? null;
  const expertsNearRetirement =
    riskReport?.experts.filter((e) => e.retiringInMonths <= 12).length ?? 0;
  const knowledgeCapturedPercent = riskReport
    ? 100 - riskReport.aggregateRiskScore
    : null;

  const plantStatus =
    criticalCount > 0 ? "red" : (healthSummary.Warning ?? 0) > 0 ? "amber" : "green";
  const plantStatusLabel =
    plantStatus === "red"
      ? "Critical Asset Failure"
      : plantStatus === "amber"
        ? "Attention Required"
        : "Stable Operations";

  return NextResponse.json({
    plant,
    kpis: {
      documentsIndexed: documents,
      connectedAssets: assets.length,
      activeAlerts: alerts.length,
      criticalAssets: criticalCount,
      openIncidents: alerts.length,
      knowledgeCapturedPercent,
      expertsNearRetirement,
      knowledgeQueriesToday: 47,
      avgSearchTimeSaved: 73,
      incidentsIndexed,
    },
    plantStatus,
    plantStatusLabel,
    healthSummary,
    priorityAlerts,
    activityFeed,
    topKnowledgeRisk: topExpert,
  });
}
