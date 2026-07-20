"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Boxes,
  AlertTriangle,
  BrainCircuit,
  UserRound,
  Search,
} from "lucide-react";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { HEALTH_COLORS, SEVERITY_STYLES } from "@/lib/ui/status-styles";

type ExpertProfile = {
  name: string;
  retiringInMonths: number;
  knowledgeRiskScore: number;
  assetsManaged: string[];
};

type CommandData = {
  plant: { name: string; location: string };
  plantStatus: "green" | "amber" | "red";
  plantStatusLabel: string;
  kpis: {
    criticalAssets: number;
    openIncidents: number;
    knowledgeCapturedPercent: number | null;
    expertsNearRetirement: number;
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
  topKnowledgeRisk: ExpertProfile | null;
};

const PLANT_STATUS_DOT: Record<CommandData["plantStatus"], string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
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
          color: HEALTH_COLORS[name] ?? "#7c8a80",
        }))
    : [];

  const kpis = data?.kpis;

  const todaysSummary = data
    ? `${data.priorityAlerts.length} High Priority Incident${data.priorityAlerts.length === 1 ? "" : "s"} · ${kpis!.criticalAssets} Critical Asset${kpis!.criticalAssets === 1 ? "" : "s"} · ${kpis!.expertsNearRetirement} Knowledge Risk${kpis!.expertsNearRetirement === 1 ? "" : "s"}`
    : null;

  return (
    <PageShell
      title="Industrial Brain"
      subtitle={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${data ? PLANT_STATUS_DOT[data.plantStatus] : "bg-muted-foreground"}`}
            />
            {data?.plantStatusLabel ?? "Checking plant status…"}
          </span>
          {todaysSummary && <span>{todaysSummary}</span>}
        </div>
      }
      hero={
        <HeroBand cols={4}>
          <HeroMetricCard
            label="Critical Assets"
            value={kpis?.criticalAssets ?? "—"}
            icon={Boxes}
          />
          <HeroMetricCard
            label="Open Incidents"
            value={kpis?.openIncidents ?? "—"}
            icon={AlertTriangle}
          />
          <HeroMetricCard
            label="Knowledge Captured"
            value={kpis?.knowledgeCapturedPercent != null ? `${kpis.knowledgeCapturedPercent}%` : "—"}
            icon={BrainCircuit}
          />
          <HeroMetricCard
            label="Experts Retiring Soon"
            value={kpis?.expertsNearRetirement ?? "—"}
            icon={UserRound}
          />
        </HeroBand>
      }
    >
      <ContentCard title="Start Investigation">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              Search machine, symptoms, incidents, SOPs or experts from the top bar.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every search opens an AI investigation so the engineer moves from problem to evidence to recommendation without restarting.
            </p>
          </div>
          <Button render={<Link href="/rca" />}>
            <Search />
            Investigate
          </Button>
        </div>
      </ContentCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <ContentCard
          title="Recommended Investigations"
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
                  <Link
                    href={`/rca?asset=${alert.assetTag}&query=${encodeURIComponent(alert.title)}`}
                    className="font-medium truncate hover:text-primary"
                  >
                    {alert.title}
                  </Link>
                  <Link
                    href={`/assets/${alert.assetTag}`}
                    className="text-xs font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
                  >
                    {alert.assetTag}
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {alert.confidence}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      href={`/rca?asset=${alert.assetTag}&query=${encodeURIComponent(alert.title)}`}
                    />
                  }
                >
                  Investigate
                </Button>
              </div>
            ))}
          </div>
        </ContentCard>

        <ContentCard
          title="Knowledge At Risk"
          className="border-amber-500/40 bg-amber-500/5"
          action={
            <Link href="/knowledge-risk" className="text-xs text-primary hover:underline">
              View all
            </Link>
          }
        >
          {data?.topKnowledgeRisk ? (
            <div className="space-y-3">
              <div>
                <p className="font-semibold">{data.topKnowledgeRisk.name}</p>
                <p className="text-sm text-muted-foreground">
                  Retiring in {data.topKnowledgeRisk.retiringInMonths * 30} days
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Knowledge Captured{" "}
                  <strong className="tabular-nums">
                    {100 - data.topKnowledgeRisk.knowledgeRiskScore}%
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.topKnowledgeRisk.assetsManaged.map((a) => (
                  <Badge key={a} variant="outline" className="text-[10px]">
                    {a}
                  </Badge>
                ))}
              </div>
              <Link href="/documents">
                <Button size="sm" className="w-full">
                  Capture Expert Knowledge
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No experts tracked yet.</p>
          )}
        </ContentCard>
      </div>

      <ContentCard title="Organizational Memory Updates">
        <div className="space-y-3">
          {(data?.activityFeed ?? []).map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 text-sm border-b border-border/60 pb-3 last:border-0 last:pb-0"
            >
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {new Date(item.timestamp).toLocaleString()}
              </span>
              <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {item.type}
                </Badge>
                <p className="flex-1 min-w-0 break-words">{item.message}</p>
              </div>
              <Link
                href={`/assets/${item.assetTag}`}
                className="text-xs font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary shrink-0 sm:self-start"
              >
                {item.assetTag}
              </Link>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Plant Health">
        {healthChart.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {healthChart.map((h) => (
              <span key={h.name} className="text-sm flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: h.color }}
                />
                {h.name}: <strong className="tabular-nums">{h.value}</strong>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading asset health…</p>
        )}
      </ContentCard>
    </PageShell>
  );
}
