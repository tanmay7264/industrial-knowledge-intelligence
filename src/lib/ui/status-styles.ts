import type { AssetStatus } from "@/lib/seed";

export const ASSET_STATUS_STYLES: Record<AssetStatus, string> = {
  Healthy: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40",
  Monitoring: "bg-primary/15 text-primary border-primary/40",
  Warning: "bg-amber-500/20 text-amber-700 border-amber-500/40",
  Critical: "bg-red-500/20 text-red-700 border-red-500/40",
  "Maintenance Due": "bg-[#8a6d1f]/15 text-[#8a6d1f] border-[#8a6d1f]/40",
};

export const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-700 border-red-500/40",
  High: "bg-orange-500/20 text-orange-700 border-orange-500/40",
  Medium: "bg-yellow-500/30 text-yellow-800 border-yellow-500/50",
  Low: "bg-muted text-muted-foreground border-border",
};

export const HEALTH_COLORS: Record<string, string> = {
  Healthy: "#10b981",
  Monitoring: "#17402f",
  Warning: "#f59e0b",
  Critical: "#ef4444",
  "Maintenance Due": "#8a6d1f",
};
