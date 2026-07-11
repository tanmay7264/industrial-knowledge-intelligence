import plantData from "./plant.json";
import assetsData from "./assets.json";
import alertsData from "./alerts.json";
import timelineData from "./timeline.json";
import activityFeedData from "./activity-feed.json";

export type PlantArea = { id: string; name: string };
export type Plant = {
  id: string;
  name: string;
  location: string;
  areas: PlantArea[];
};

export type AssetStatus =
  | "Healthy"
  | "Monitoring"
  | "Warning"
  | "Critical"
  | "Maintenance Due";

export type Asset = {
  tag: string;
  name: string;
  type: string;
  manufacturer: string;
  plantArea: string;
  installationDate: string;
  status: AssetStatus;
  healthScore: number;
  riskScore: number;
  lastInspection: string;
};

export type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
export type Alert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  assetTag: string;
  confidence: number;
  status: "open" | "info" | "acknowledged";
  recommendedAction: string;
  evidenceDoc: string | null;
};

export type TimelineEvent = {
  date: string;
  type: string;
  title: string;
  description: string;
  document: string | null;
};

export type ActivityFeedItem = {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  assetTag: string;
};

const plant = plantData as Plant;
const assets = assetsData as Asset[];
const alerts = alertsData as Alert[];
const timeline = timelineData as Record<string, TimelineEvent[]>;
const activityFeed = activityFeedData as ActivityFeedItem[];

export function getPlantOverview(): Plant {
  return plant;
}

export function getAssets(filter?: {
  plantArea?: string;
  status?: AssetStatus;
}): Asset[] {
  let result = [...assets];
  if (filter?.plantArea) {
    result = result.filter((a) => a.plantArea === filter.plantArea);
  }
  if (filter?.status) {
    result = result.filter((a) => a.status === filter.status);
  }
  return result;
}

export function getAsset(tag: string): Asset | undefined {
  return assets.find((a) => a.tag.toUpperCase() === tag.toUpperCase());
}

export function getAlerts(filter?: {
  severity?: AlertSeverity;
  status?: Alert["status"];
  assetTag?: string;
}): Alert[] {
  let result = [...alerts];
  if (filter?.severity) {
    result = result.filter((a) => a.severity === filter.severity);
  }
  if (filter?.status) {
    result = result.filter((a) => a.status === filter.status);
  }
  if (filter?.assetTag) {
    result = result.filter(
      (a) => a.assetTag.toUpperCase() === filter.assetTag!.toUpperCase()
    );
  }
  return result;
}

export function getTimeline(assetTag: string): TimelineEvent[] {
  return timeline[assetTag.toUpperCase()] ?? timeline[assetTag] ?? [];
}

export function getActivityFeed(limit = 10): ActivityFeedItem[] {
  return activityFeed
    .slice()
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);
}

export function getAssetHealthSummary(): Record<string, number> {
  const summary: Record<string, number> = {
    Healthy: 0,
    Monitoring: 0,
    Warning: 0,
    Critical: 0,
    "Maintenance Due": 0,
  };
  for (const asset of assets) {
    summary[asset.status] = (summary[asset.status] ?? 0) + 1;
  }
  return summary;
}

export function searchSeeds(query: string): {
  assets: Asset[];
  alerts: Alert[];
} {
  const q = query.toLowerCase();
  const matchedAssets = assets.filter(
    (a) =>
      a.tag.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.plantArea.toLowerCase().includes(q)
  );
  const matchedAlerts = alerts.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.assetTag.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
  );
  return { assets: matchedAssets, alerts: matchedAlerts };
}
