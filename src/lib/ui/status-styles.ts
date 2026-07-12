import type { AssetStatus } from "@/lib/seed";

export const ASSET_STATUS_STYLES: Record<AssetStatus, string> = {
  Healthy: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40",
  Monitoring: "bg-blue-500/20 text-blue-700 border-blue-500/40",
  Warning: "bg-amber-500/20 text-amber-700 border-amber-500/40",
  Critical: "bg-red-500/20 text-red-700 border-red-500/40",
  "Maintenance Due": "bg-purple-500/20 text-purple-700 border-purple-500/40",
};

export const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-700 border-red-500/40",
  High: "bg-orange-500/20 text-orange-700 border-orange-500/40",
  Medium: "bg-yellow-500/20 text-yellow-700 border-yellow-500/40",
  Low: "bg-slate-500/20 text-slate-600 border-slate-500/40",
};

export const HEALTH_COLORS: Record<string, string> = {
  Healthy: "#10b981",
  Monitoring: "#3b82f6",
  Warning: "#f59e0b",
  Critical: "#ef4444",
  "Maintenance Due": "#a855f7",
};
