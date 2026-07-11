"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-300",
  High: "bg-orange-500/20 text-orange-300",
  Medium: "bg-yellow-500/20 text-yellow-300",
  Low: "bg-slate-500/20 text-slate-300",
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
      prev.map((a) => (a.id === alertId ? { ...a, status: "acknowledged" } : a))
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Alerts & Proactive Insights</h1>
        <p className="text-sm text-muted-foreground">
          Evidence-backed intelligence alerts and AI-generated insights
        </p>
      </header>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">AI Insights</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {insights.map((ins) => (
            <div key={ins.id} className="border rounded-lg p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{ins.type}</Badge>
                <span className="text-xs tabular-nums">{ins.confidence}%</span>
              </div>
              <p className="font-medium">{ins.title}</p>
              <p className="text-muted-foreground mt-1">{ins.description}</p>
              <Link href={`/assets/${ins.assetTag}`} className="text-xs text-primary mt-2 inline-block">
                {ins.assetTag} →
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Active Alerts ({alerts.length})</h2>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="border rounded-lg p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={SEVERITY_STYLES[alert.severity] ?? ""}>{alert.severity}</Badge>
                <Link href={`/assets/${alert.assetTag}`} className="font-mono text-primary">
                  {alert.assetTag}
                </Link>
                <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                  {alert.confidence}% confidence
                </span>
              </div>
              <p className="font-medium">{alert.title}</p>
              <p className="text-muted-foreground mt-1">{alert.description}</p>
              <p className="text-xs mt-2"><strong>Action:</strong> {alert.recommendedAction}</p>
              {alert.status !== "acknowledged" && alert.status !== "info" && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => acknowledge(alert.id)}>
                  Acknowledge
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
