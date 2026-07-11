import { getAlerts, getAssets, getActivityFeed } from "@/lib/seed";
import { findSimilarIncidents } from "@/lib/graph/retrieve";

export interface Insight {
  id: string;
  title: string;
  description: string;
  assetTag: string;
  confidence: number;
  type: "pattern" | "risk" | "recommendation";
}

export async function generateInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];
  const alerts = getAlerts({ status: "open" });
  const assets = getAssets();

  const p301Alerts = alerts.filter((a) => a.assetTag === "P-301");
  if (p301Alerts.length >= 2) {
    insights.push({
      id: "ins-p301-pattern",
      title: "Recurring failure pattern on P-301",
      description:
        "Multiple open alerts indicate bearing failures without documented alignment checks.",
      assetTag: "P-301",
      confidence: 87,
      type: "pattern",
    });
  }

  const coolingPumps = assets.filter((a) =>
    ["P-301", "P-305", "P-318"].includes(a.tag)
  );
  if (coolingPumps.every((p) => p.status !== "Healthy")) {
    insights.push({
      id: "ins-fleet",
      title: "Cooling water pump fleet at elevated risk",
      description:
        "P-301, P-305, and P-318 all show warning or monitoring status — group reliability review recommended.",
      assetTag: "P-301",
      confidence: 74,
      type: "risk",
    });
  }

  const criticalAssets = assets.filter((a) => a.status === "Critical");
  for (const asset of criticalAssets) {
    insights.push({
      id: `ins-critical-${asset.tag}`,
      title: `${asset.tag} requires immediate attention`,
      description: `${asset.name} is in Critical status with risk score ${asset.riskScore}.`,
      assetTag: asset.tag,
      confidence: 90,
      type: "recommendation",
    });
  }

  try {
    const similar = await findSimilarIncidents("P-301", ["bearing", "vibration"]);
    if (similar.length >= 2) {
      insights.push({
        id: "ins-graph-p301",
        title: "Graph confirms repeated P-301 incidents",
        description: `${similar.length} similar incidents linked in knowledge graph.`,
        assetTag: "P-301",
        confidence: 82,
        type: "pattern",
      });
    }
  } catch {
    // Neo4j may be unavailable
  }

  const feed = getActivityFeed(3);
  for (const item of feed) {
    if (item.type === "rca" || item.type === "pattern") {
      insights.push({
        id: `ins-feed-${item.id}`,
        title: item.message.slice(0, 80),
        description: item.message,
        assetTag: item.assetTag,
        confidence: 75,
        type: "recommendation",
      });
    }
  }

  return insights.slice(0, 8);
}
