"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Brain, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { SEVERITY_STYLES } from "@/lib/ui/status-styles";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

type Alert = {
  id: string;
  severity: string;
  title: string;
  description: string;
  assetTag: string;
  confidence: number;
  status: string;
  recommendedAction: string;
};

type Insight = {
  id: string;
  title: string;
  description: string;
  assetTag: string;
  confidence: number;
  type: string;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/insights").then((r) => r.json()),
    ]).then(([alertData, insightData]) => {
      setAlerts(alertData.alerts ?? []);
      setInsights(insightData.insights ?? []);
    });
  }, []);

  const acknowledge = async (alertId: string) => {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acknowledge", alertId }),
    });
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: "acknowledged" } : a
      )
    );
  };

  const avgConfidence =
    alerts.length > 0
      ? Math.round(
          alerts.reduce((s, a) => s + a.confidence, 0) / alerts.length
        )
      : 0;

  return (
    <PageShell
      title="Alerts & Proactive Insights"
      subtitle="Evidence-backed intelligence alerts and AI-generated insights"
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Active Alerts"
            value={alerts.length}
            icon={Bell}
            trend={-5}
            sparklineData={sparklineFromSeed(alerts.length + 10)}
            sparklineColor="#ef4444"
          />
          <HeroMetricCard
            label="AI Insights"
            value={insights.length}
            icon={Brain}
            trend={12}
            sparklineData={sparklineFromSeed(insights.length + 20)}
          />
          <HeroMetricCard
            label="Avg Confidence"
            value={`${avgConfidence}%`}
            icon={TrendingUp}
            trend={3}
            sparklineData={sparklineFromSeed(avgConfidence)}
            sparklineColor="#10b981"
          />
        </HeroBand>
      }
    >
      <ContentCard title="AI Insights">
        <div className="grid sm:grid-cols-2 gap-3">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className="rounded-xl border border-border/60 p-4 text-sm bg-muted/20"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{ins.type}</Badge>
                <span className="text-xs tabular-nums">{ins.confidence}%</span>
              </div>
              <p className="font-medium">{ins.title}</p>
              <p className="text-muted-foreground mt-1">{ins.description}</p>
              <Link
                href={`/assets/${ins.assetTag}`}
                className="text-xs text-primary mt-2 inline-block"
              >
                {ins.assetTag} →
              </Link>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title={`Active Alerts (${alerts.length})`}>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border border-border/60 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={SEVERITY_STYLES[alert.severity] ?? ""}>
                  {alert.severity}
                </Badge>
                <Link
                  href={`/assets/${alert.assetTag}`}
                  className="font-mono text-primary"
                >
                  {alert.assetTag}
                </Link>
                <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                  {alert.confidence}% confidence
                </span>
              </div>
              <p className="font-medium">{alert.title}</p>
              <p className="text-muted-foreground mt-1">{alert.description}</p>
              <p className="text-xs mt-2">
                <strong>Action:</strong> {alert.recommendedAction}
              </p>
              {alert.status !== "acknowledged" && alert.status !== "info" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => acknowledge(alert.id)}
                >
                  Acknowledge
                </Button>
              )}
            </div>
          ))}
        </div>
      </ContentCard>
    </PageShell>
  );
}
