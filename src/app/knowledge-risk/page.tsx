"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  User,
  Wrench,
  FileWarning,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KnowledgeRiskReport } from "@/lib/agents/knowledge-risk";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

function riskColor(score: number): string {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function KnowledgeRiskPage() {
  const [report, setReport] = useState<KnowledgeRiskReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge-risk")
      .then((r) => r.json())
      .then((d) => setReport(d.report ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell
      title="Knowledge Risk Dashboard"
      subtitle="When experts retire, knowledge shouldn't. Track critical expertise at risk."
      maxWidth="lg"
      hero={
        report ? (
          <HeroBand cols={4}>
            <HeroMetricCard
              label="Experts Tracked"
              value={report.expertsTracked}
              icon={User}
              trend={2}
              sparklineData={sparklineFromSeed(report.expertsTracked)}
            />
            <HeroMetricCard
              label="Aggregate Risk"
              value={`${report.aggregateRiskScore}%`}
              icon={AlertTriangle}
              trend={-4}
              sparklineData={sparklineFromSeed(report.aggregateRiskScore)}
              sparklineColor="#ef4444"
            />
            <HeroMetricCard
              label="Incidents Indexed"
              value={report.incidentsIndexed}
              icon={Wrench}
              trend={18}
              sparklineData={sparklineFromSeed(report.incidentsIndexed)}
            />
            <HeroMetricCard
              label="Missing Docs"
              value={report.missingKnowledge.length}
              icon={FileWarning}
              trend={-6}
              sparklineData={sparklineFromSeed(report.missingKnowledge.length + 10)}
              sparklineColor="#f59e0b"
            />
          </HeroBand>
        ) : undefined
      }
    >
      {loading && (
        <p className="text-muted-foreground text-sm">Loading knowledge risk report…</p>
      )}

      {report && (
        <>
          <ContentCard title="Experts Retiring Soon">
            <div className="space-y-3">
              {report.experts.map((expert) => (
                <div
                  key={expert.id}
                  className="rounded-xl border border-border/60 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading font-bold">{expert.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {expert.experienceYears} years experience ·{" "}
                        {expert.incidentsSolved} incidents solved
                      </p>
                    </div>
                    <Badge
                      className={`${riskColor(expert.knowledgeRiskScore)} text-white`}
                    >
                      {expert.knowledgeRiskScore}% risk
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                    <span>Retiring in {expert.retiringInMonths} months</span>
                    <span>Assets: {expert.assetsManaged.join(", ")}</span>
                  </div>
                  {expert.missingDocumentation.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-amber-700 mb-1">
                        Missing documentation
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {expert.missingDocumentation.map((gap) => (
                          <li key={gap}>• {gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Critical Assets">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {report.criticalAssets.map(({ asset, expertCount, riskLevel }) => (
                <Link
                  key={asset}
                  href={`/playbook?q=${encodeURIComponent(`${asset} operational issue`)}`}
                  className="card-rich rounded-xl border border-border/60 p-4 group"
                >
                  <p className="font-heading font-bold">{asset}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {expertCount} expert(s) · {riskLevel} risk
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </ContentCard>

          <Link href="/documents">
            <Button className="gap-2 glow-primary">
              Capture expert knowledge via Documents
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </>
      )}
    </PageShell>
  );
}
