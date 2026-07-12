"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Boxes,
  MessageSquare,
} from "lucide-react";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { HEALTH_COLORS, SEVERITY_STYLES } from "@/lib/ui/status-styles";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

type CommandData = {
  plant: { name: string; location: string };
  kpis: {
    documentsIndexed: number;
    connectedAssets: number;
    activeAlerts: number;
    criticalAssets: number;
    knowledgeQueriesToday: number;
    avgSearchTimeSaved: number;
  };
  healthSummary: Record<string, number>;
  priorityAlerts: {
    id: string;
    severity: string;
    title: string;
    assetTag: string;
    confidence: number;
  }[];
  activityFeed: {
    id: string;
    timestamp: string;
    type: string;
    message: string;
    assetTag: string;
  }[];
};

export default function CommandCenterPage() {
  const [data, setData] = useState<CommandData | null>(null);

  useEffect(() => {
    fetch("/api/command")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const healthChart = data
    ? Object.entries(data.healthSummary)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name,
          value,
          color: HEALTH_COLORS[name] ?? "#94a3b8",
        }))
    : [];

  const kpis = data?.kpis;

  return (
    <PageShell
      title="Good Morning, Plant Operations Team"
      subtitle={`${data?.plant.name ?? "Apex Steel"} · ${data?.plant.location ?? "Industrial Zone"} — Command Center`}
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Documents Indexed"
            value={kpis?.documentsIndexed ?? "—"}
            icon={FileText}
            trend={12}
            sparklineData={sparklineFromSeed(kpis?.documentsIndexed ?? 31)}
          />
          <HeroMetricCard
            label="Connected Assets"
            value={kpis?.connectedAssets ?? "—"}
            icon={Boxes}
            trend={4}
            trendLabel={`${kpis?.criticalAssets ?? 0} critical`}
            sparklineData={sparklineFromSeed(kpis?.connectedAssets ?? 12)}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="Queries Today"
            value={kpis?.knowledgeQueriesToday ?? "—"}
            icon={MessageSquare}
            trend={18}
            trendLabel={
              kpis ? `${kpis.avgSearchTimeSaved}% time saved` : undefined
            }
            sparklineData={sparklineFromSeed(kpis?.knowledgeQueriesToday ?? 24)}
            sparklineColor="oklch(0.65 0.14 78)"
          />
        </HeroBand>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <ContentCard title="Plant Intelligence Overview">
          <div className="h-56">
            {healthChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {healthChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Loading asset health…
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {healthChart.map((h) => (
              <span key={h.name} className="text-xs flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: h.color }}
                />
                {h.name}: {h.value}
              </span>
            ))}
          </div>
        </ContentCard>

        <ContentCard
          title="Priority Alerts"
          action={
            <Link href="/alerts" className="text-xs text-primary hover:underline">
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {(data?.priorityAlerts ?? []).slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 text-sm border-b border-border pb-3 last:border-0"
              >
                <Badge
                  variant="outline"
                  className={SEVERITY_STYLES[alert.severity] ?? ""}
                >
                  {alert.severity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{alert.title}</p>
                  <Link
                    href={`/assets/${alert.assetTag}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {alert.assetTag}
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {alert.confidence}%
                </span>
              </div>
            ))}
          </div>
        </ContentCard>
      </div>

      <ContentCard title="Knowledge Activity Feed">
        <div className="space-y-3">
          {(data?.activityFeed ?? []).map((item) => (
            <div key={item.id} className="flex items-start gap-3 text-sm">
              <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-36">
                {new Date(item.timestamp).toLocaleString()}
              </span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {item.type}
              </Badge>
              <p className="flex-1">{item.message}</p>
              <Link
                href={`/assets/${item.assetTag}`}
                className="text-xs text-primary shrink-0"
              >
                {item.assetTag}
              </Link>
            </div>
          ))}
        </div>
      </ContentCard>
    </PageShell>
  );
}
