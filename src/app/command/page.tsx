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
import { Card } from "@/components/ui/card";
import {
  FileText,
  Boxes,
  Bell,
  AlertTriangle,
  MessageSquare,
  Clock,
} from "lucide-react";

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

const HEALTH_COLORS: Record<string, string> = {
  Healthy: "#10b981",
  Monitoring: "#3b82f6",
  Warning: "#f59e0b",
  Critical: "#ef4444",
  "Maintenance Due": "#a855f7",
};

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-300 border-red-500/40",
  High: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  Medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  Low: "bg-slate-500/20 text-slate-300 border-slate-500/40",
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
        .map(([name, value]) => ({ name, value, color: HEALTH_COLORS[name] ?? "#94a3b8" }))
    : [];

  const kpis = data?.kpis;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Good Morning, Plant Operations Team
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data?.plant.name ?? "Apex Steel"} · {data?.plant.location ?? "Industrial Zone"} — Industrial Brain Command Center
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Documents Indexed", value: kpis?.documentsIndexed ?? "—", icon: FileText },
          { label: "Connected Assets", value: kpis?.connectedAssets ?? "—", icon: Boxes },
          { label: "Active Alerts", value: kpis?.activeAlerts ?? "—", icon: Bell },
          { label: "Critical Assets", value: kpis?.criticalAssets ?? "—", icon: AlertTriangle },
          { label: "Queries Today", value: kpis?.knowledgeQueriesToday ?? "—", icon: MessageSquare },
          { label: "Time Saved", value: kpis ? `${kpis.avgSearchTimeSaved}%` : "—", icon: Clock },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <kpi.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wide">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Plant Intelligence Overview</h2>
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
                <span className="h-2 w-2 rounded-full" style={{ background: h.color }} />
                {h.name}: {h.value}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Priority Alerts</h2>
            <Link href="/alerts" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.priorityAlerts ?? []).slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 text-sm border-b border-border pb-3 last:border-0">
                <Badge variant="outline" className={SEVERITY_STYLES[alert.severity] ?? ""}>
                  {alert.severity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{alert.title}</p>
                  <Link href={`/assets/${alert.assetTag}`} className="text-xs text-primary hover:underline">
                    {alert.assetTag}
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{alert.confidence}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Knowledge Activity Feed</h2>
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
              <Link href={`/assets/${item.assetTag}`} className="text-xs text-primary shrink-0">
                {item.assetTag}
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
