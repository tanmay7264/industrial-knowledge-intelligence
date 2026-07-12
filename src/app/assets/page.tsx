"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, Wrench } from "lucide-react";
import { getAssets, getPlantOverview } from "@/lib/seed";
import { Badge } from "@/components/ui/badge";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  FilterPills,
} from "@/components/page-shell";
import { ASSET_STATUS_STYLES } from "@/lib/ui/status-styles";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

export default function AssetsPage() {
  const plant = getPlantOverview();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const allAssets = getAssets();
  const assets = getAssets(
    areaFilter === "all" ? undefined : { plantArea: areaFilter }
  );

  const stats = useMemo(() => {
    const critical = allAssets.filter((a) => a.status === "Critical").length;
    const maintenance = allAssets.filter(
      (a) => a.status === "Maintenance Due"
    ).length;
    return { total: allAssets.length, critical, maintenance };
  }, [allAssets]);

  const filterOptions = [
    { id: "all", label: "All Areas" },
    ...plant.areas.map((a) => ({ id: a.name, label: a.name })),
  ];

  return (
    <PageShell
      title="Asset 360 Registry"
      subtitle={`${plant.name} — ${assets.length} connected assets`}
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Connected Assets"
            value={stats.total}
            icon={Boxes}
            trend={3}
            sparklineData={sparklineFromSeed(stats.total)}
          />
          <HeroMetricCard
            label="Critical Assets"
            value={stats.critical}
            icon={AlertTriangle}
            trend={-2}
            sparklineData={sparklineFromSeed(stats.critical + 100)}
            sparklineColor="#ef4444"
          />
          <HeroMetricCard
            label="Maintenance Due"
            value={stats.maintenance}
            icon={Wrench}
            trendLabel="Scheduled this week"
            sparklineData={sparklineFromSeed(stats.maintenance + 200)}
            sparklineColor="#a855f7"
          />
        </HeroBand>
      }
    >
      <FilterPills
        options={filterOptions}
        value={areaFilter}
        onChange={setAreaFilter}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <Link key={asset.tag} href={`/assets/${asset.tag}`}>
            <div className="card-rich rounded-xl border border-border/60 p-4 h-full">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono font-bold text-primary">
                  {asset.tag}
                </span>
                <Badge
                  variant="outline"
                  className={ASSET_STATUS_STYLES[asset.status]}
                >
                  {asset.status}
                </Badge>
              </div>
              <p className="text-sm font-medium mb-1">{asset.name}</p>
              <p className="text-xs text-muted-foreground mb-3">
                {asset.plantArea} · {asset.type}
              </p>
              <div className="flex justify-between text-xs">
                <span>
                  Health <strong>{asset.healthScore}</strong>
                </span>
                <span>
                  Risk{" "}
                  <strong className="text-destructive">{asset.riskScore}</strong>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
