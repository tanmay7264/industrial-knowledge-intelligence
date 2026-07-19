"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, Wrench, BrainCircuit } from "lucide-react";
import { getAssets, getPlantOverview, getTimeline } from "@/lib/seed";
import expertsData from "@/lib/agents/experts.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  FilterPills,
} from "@/components/page-shell";
import { ASSET_STATUS_STYLES } from "@/lib/ui/status-styles";

type ExpertProfile = { name: string; retiringInMonths: number; assetsManaged: string[] };
const experts = expertsData as ExpertProfile[];

// ponytail: knowledge coverage = documented-events proxy (timeline length),
// not a weighted model. Upgrade to blend incidents/lessons/docs when that
// per-asset data is available on the list endpoint without an N+1 fetch.
function knowledgeCoverage(tag: string): number {
  return Math.min(100, getTimeline(tag).length * 25);
}

function daysAgo(date: string): number {
  return Math.round((Date.now() - new Date(date).getTime()) / 86_400_000);
}

const QUICK_FILTERS = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical Assets" },
  { id: "gap", label: "Knowledge Gap" },
  { id: "recent", label: "Recently Updated" },
];

export default function AssetsPage() {
  const plant = getPlantOverview();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const allAssets = getAssets();
  const areaAssets = getAssets(
    areaFilter === "all" ? undefined : { plantArea: areaFilter }
  );

  const assets = useMemo(() => {
    if (quickFilter === "critical") {
      return areaAssets.filter((a) => a.status === "Critical");
    }
    if (quickFilter === "gap") {
      return areaAssets.filter((a) => knowledgeCoverage(a.tag) < 50);
    }
    if (quickFilter === "recent") {
      return areaAssets.filter((a) => getTimeline(a.tag).length > 0);
    }
    return areaAssets;
  }, [areaAssets, quickFilter]);

  const stats = useMemo(() => {
    const critical = allAssets.filter((a) => a.status === "Critical").length;
    const maintenance = allAssets.filter(
      (a) => a.status === "Maintenance Due"
    ).length;
    const avgCoverage = Math.round(
      allAssets.reduce((sum, a) => sum + knowledgeCoverage(a.tag), 0) /
        allAssets.length
    );
    return { total: allAssets.length, critical, maintenance, avgCoverage };
  }, [allAssets]);

  const filterOptions = [
    { id: "all", label: "All Areas" },
    ...plant.areas.map((a) => ({ id: a.name, label: a.name })),
  ];

  return (
    <PageShell
      title="Plant Asset Intelligence"
      subtitle="Operational Digital Twin of Every Critical Asset"
      hero={
        <HeroBand cols={4}>
          <HeroMetricCard label="Connected Assets" value={stats.total} icon={Boxes} />
          <HeroMetricCard
            label="Critical Assets"
            value={stats.critical}
            icon={AlertTriangle}
          />
          <HeroMetricCard
            label="Maintenance Due"
            value={stats.maintenance}
            icon={Wrench}
          />
          <HeroMetricCard
            label="Knowledge Coverage"
            value={`${stats.avgCoverage}%`}
            icon={BrainCircuit}
          />
        </HeroBand>
      }
    >
      <p className="text-xs text-muted-foreground -mt-2">
        Knowledge Coverage: share of organizational knowledge captured for an
        asset — SOPs, incidents, work orders, expert notes and playbooks.
      </p>

      <FilterPills
        options={filterOptions}
        value={areaFilter}
        onChange={setAreaFilter}
      />
      <FilterPills
        options={QUICK_FILTERS}
        value={quickFilter}
        onChange={setQuickFilter}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assets.map((asset) => {
          const coverage = knowledgeCoverage(asset.tag);
          const timeline = getTimeline(asset.tag);
          const lastIncident = timeline
            .filter((e) => e.type === "incident")
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          const contributor = experts.find((e) =>
            e.assetsManaged.includes(asset.tag)
          );

          return (
            <div key={asset.tag} className="card-rich rounded-xl border border-border/60 p-4 h-full flex flex-col">
              <Link href={`/assets/${asset.tag}`} className="flex-1">
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
                <div className="flex justify-between text-xs mb-3">
                  <span>
                    Health <strong>{asset.healthScore}</strong>
                  </span>
                  <span>
                    Risk{" "}
                    <strong className="text-destructive">{asset.riskScore}</strong>
                  </span>
                  <span>
                    Knowledge <strong>{coverage}%</strong>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5 border-t border-border/60 pt-2">
                  <p>
                    Last Incident:{" "}
                    {lastIncident ? `${daysAgo(lastIncident.date)} days ago` : "None recorded"}
                  </p>
                  <p>
                    Expert on Record:{" "}
                    {contributor
                      ? `${contributor.name} · retiring in ${contributor.retiringInMonths}mo`
                      : "None assigned"}
                  </p>
                </div>
              </Link>
              <Link href={`/playbook?q=${encodeURIComponent(`${asset.tag} operational issue`)}`}>
                <Button size="sm" variant="outline" className="w-full mt-3">
                  Generate AI Playbook
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
