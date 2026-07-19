"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

type IncidentsData = {
  incidents: {
    id: string;
    asset: string;
    date?: string;
    summary: string;
    rootCause?: string;
    impact?: string;
  }[];
  patterns: {
    id: string;
    title: string;
    assets: string[];
    description: string;
    confidence: number;
  }[];
};

export default function IncidentsPage() {
  const [data, setData] = useState<IncidentsData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const selectedIncident = data?.incidents.find((i) => i.id === selected);
  const incidentCount = data?.incidents.length ?? 0;
  const patternCount = data?.patterns.length ?? 0;

  return (
    <PageShell
      title="Failure Intelligence"
      subtitle="Learn from previous failures, understand how they were solved and reuse operational experience in new investigations."
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Total Incidents"
            value={incidentCount}
            icon={AlertTriangle}
            trend={-3}
            sparklineData={sparklineFromSeed(incidentCount + 50)}
          />
          <HeroMetricCard
            label="Recurring Patterns"
            value={patternCount}
            icon={Repeat}
            trend={6}
            sparklineData={sparklineFromSeed(patternCount + 60)}
            sparklineColor="#f59e0b"
          />
          <HeroMetricCard
            label="Avg Resolution"
            value="4.2d"
            icon={Clock}
            trend={-12}
            trendLabel="Days to close"
            sparklineData={sparklineFromSeed(42)}
            sparklineColor="#10b981"
          />
        </HeroBand>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <ContentCard title="Historical Knowledge">
          <div className="space-y-3">
            {(data?.patterns ?? []).map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border/60 p-4 text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{p.title}</p>
                  <Badge variant="outline">{p.confidence}%</Badge>
                </div>
                <p className="text-muted-foreground mb-2">{p.description}</p>
                <div className="flex flex-wrap gap-2">
                  {p.assets.map((a) => (
                    <Link
                      key={a}
                      href={`/assets/${a}`}
                      className="text-xs text-primary underline"
                    >
                      {a}
                    </Link>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <Link
                        href={`/rca?query=${encodeURIComponent(p.title)}&asset=${p.assets[0] ?? ""}`}
                      />
                    }
                  >
                    Investigate Pattern
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ContentCard>

        <ContentCard title="Incident Summary">
          {selectedIncident ? (
            <div className="text-sm space-y-2">
              <p className="font-medium">{selectedIncident.summary}</p>
              <p className="text-muted-foreground">{selectedIncident.impact}</p>
              {selectedIncident.rootCause && (
                <p>
                  <strong>Root cause:</strong> {selectedIncident.rootCause}
                </p>
              )}
              <Link
                href={`/rca?asset=${selectedIncident.asset}`}
                className="text-primary underline"
              >
                Continue investigation on {selectedIncident.asset}
              </Link>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="block text-xs text-muted-foreground mt-2"
              >
                ← Back to list
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a historical failure to see root cause, resolution, evidence and lessons learned.
            </p>
          )}
        </ContentCard>
      </div>

      <ContentCard title="Historical Failure Cases">
        <div className="space-y-2">
          {(data?.incidents ?? []).map((inc) => (
            <button
              key={inc.id}
              type="button"
              onClick={() => setSelected(inc.id)}
              className="w-full text-left card-rich rounded-xl border border-border/60 p-4 text-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/assets/${inc.asset}`}
                  className="font-mono text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {inc.asset}
                </Link>
                {inc.date && (
                  <span className="text-xs text-muted-foreground">
                    {inc.date}
                  </span>
                )}
              </div>
              <p>{inc.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">
                  Root Cause → Resolution → Lessons Learned
                </span>
                <Link
                  href={`/rca?asset=${inc.asset}&query=${encodeURIComponent(inc.summary)}`}
                  className="text-xs text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  Continue Investigation
                </Link>
              </div>
            </button>
          ))}
        </div>
      </ContentCard>
    </PageShell>
  );
}
