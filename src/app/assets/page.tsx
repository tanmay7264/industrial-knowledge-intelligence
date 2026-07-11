"use client";

import { useState } from "react";
import Link from "next/link";
import { getAssets, getPlantOverview, type AssetStatus } from "@/lib/seed";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const STATUS_STYLES: Record<AssetStatus, string> = {
  Healthy: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  Monitoring: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  Warning: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Critical: "bg-red-500/20 text-red-300 border-red-500/40",
  "Maintenance Due": "bg-purple-500/20 text-purple-300 border-purple-500/40",
};

export default function AssetsPage() {
  const plant = getPlantOverview();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const assets = getAssets(
    areaFilter === "all" ? undefined : { plantArea: areaFilter }
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Asset 360 Registry</h1>
        <p className="text-muted-foreground text-sm">
          {plant.name} — {assets.length} connected assets
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAreaFilter("all")}
          className={`px-3 py-1 rounded-full text-xs border ${areaFilter === "all" ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
        >
          All Areas
        </button>
        {plant.areas.map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => setAreaFilter(area.name)}
            className={`px-3 py-1 rounded-full text-xs border ${areaFilter === area.name ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
          >
            {area.name}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <Link key={asset.tag} href={`/assets/${asset.tag}`}>
            <Card className="p-4 hover:border-primary/40 transition-colors h-full">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono font-bold text-primary">{asset.tag}</span>
                <Badge variant="outline" className={STATUS_STYLES[asset.status]}>
                  {asset.status}
                </Badge>
              </div>
              <p className="text-sm font-medium mb-1">{asset.name}</p>
              <p className="text-xs text-muted-foreground mb-3">{asset.plantArea} · {asset.type}</p>
              <div className="flex justify-between text-xs">
                <span>Health <strong>{asset.healthScore}</strong></span>
                <span>Risk <strong className="text-destructive">{asset.riskScore}</strong></span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
