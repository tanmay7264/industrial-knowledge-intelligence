"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Search, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";
import type { RCAReport } from "@/lib/agents/rca-types";

const STAGES = [
  "Gathering incident history",
  "Retrieving maintenance records",
  "Analyzing inspection data",
  "Searching OEM documentation",
  "Querying knowledge graph",
  "Correlating sensor trends",
  "Ranking hypotheses",
  "Generating corrective actions",
];

function RCAInner() {
  const searchParams = useSearchParams();
  const defaultAsset = searchParams.get("asset") ?? "";
  const [query, setQuery] = useState(
    defaultAsset
      ? `Why does ${defaultAsset} keep failing?`
      : "Why does Pump P-301 keep failing?"
  );
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(-1);
  const [report, setReport] = useState<RCAReport | null>(null);

  const runRCA = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setReport(null);
    setStage(0);

    const interval = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 800);

    try {
      const res = await fetch("/api/rca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          asset: defaultAsset || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      clearInterval(interval);
      setStage(STAGES.length);
      setLoading(false);
    }
  }, [query, loading, defaultAsset]);

  return (
    <PageShell
      title="RCA Intelligence Workspace"
      subtitle="Root cause analysis with ranked hypotheses and evidence-backed corrective actions"
      maxWidth="md"
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Investigations Run"
            value={report ? 1 : 0}
            icon={Search}
            trend={14}
            sparklineData={sparklineFromSeed(14)}
          />
          <HeroMetricCard
            label="Avg Confidence"
            value={report ? `${report.confidence}%` : "—"}
            icon={CheckCircle2}
            trend={report ? 5 : undefined}
            sparklineData={sparklineFromSeed(report?.confidence ?? 87)}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="Actions Generated"
            value={report?.correctiveActions.length ?? "—"}
            icon={Zap}
            trendLabel="Corrective steps"
            sparklineData={sparklineFromSeed(
              report?.correctiveActions.length ?? 3
            )}
          />
        </HeroBand>
      }
    >
      <div className="flex gap-2">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[60px] flex-1"
          disabled={loading}
        />
        <Button onClick={runRCA} disabled={loading || !query.trim()}>
          {loading ? "Investigating…" : "Run RCA"}
        </Button>
      </div>

      {loading && (
        <ContentCard>
          {STAGES.map((label, i) => (
            <div
              key={label}
              className={`flex items-center gap-3 text-sm py-1 ${
                i <= stage ? "text-foreground" : "text-muted-foreground/40"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  i < stage
                    ? "bg-emerald-500"
                    : i === stage
                      ? "bg-primary animate-pulse"
                      : "bg-muted"
                }`}
              />
              {label}
            </div>
          ))}
        </ContentCard>
      )}

      {report && (
        <ContentCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold font-heading">{report.asset}</h2>
            <Badge className="text-base px-3">{report.confidence}% confidence</Badge>
          </div>
          <p className="text-sm font-medium text-primary mb-4">
            Primary: {report.primaryHypothesis}
          </p>

          <h3 className="text-sm font-semibold mb-2">Supporting Evidence</h3>
          <div className="space-y-2 mb-4">
            {report.supportingEvidence.map((ev) => (
              <div key={ev.n} className="text-xs rounded-lg border border-border/60 p-3">
                <span className="font-mono text-primary">[{ev.n}]</span>{" "}
                {ev.fileName}
                <p className="text-muted-foreground mt-1 line-clamp-2">
                  {ev.snippet}
                </p>
              </div>
            ))}
          </div>

          {report.alternativeHypotheses.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-2">Alternative Hypotheses</h3>
              <ul className="text-sm space-y-1 mb-4">
                {report.alternativeHypotheses.map((h, i) => (
                  <li key={i}>
                    {h.cause} — {h.confidence}%
                  </li>
                ))}
              </ul>
            </>
          )}

          {report.verificationTests.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-2">Verification Tests</h3>
              <ul className="text-sm list-disc ml-4 mb-4">
                {report.verificationTests.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          )}

          <h3 className="text-sm font-semibold mb-2">Corrective Actions</h3>
          <div className="space-y-2">
            {report.correctiveActions.map((a, i) => (
              <div
                key={i}
                className="text-sm rounded-lg border border-border/60 p-3 flex justify-between gap-4"
              >
                <span>{a.action}</span>
                <Badge variant="outline">{a.urgency}</Badge>
              </div>
            ))}
          </div>

          {report.relatedAssets.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.relatedAssets.map((t) => (
                <Link
                  key={t}
                  href={`/assets/${t}`}
                  className="text-sm text-primary underline"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </ContentCard>
      )}
    </PageShell>
  );
}

export default function RCAPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <RCAInner />
    </Suspense>
  );
}
