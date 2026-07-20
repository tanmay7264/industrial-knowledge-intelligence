"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Repeat,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
  FilterPills,
} from "@/components/page-shell";
import { SEVERITY_STYLES } from "@/lib/ui/status-styles";

type Incident = {
  id: string;
  asset: string;
  machineName: string;
  department: string;
  date?: string;
  summary: string;
  rootCause?: string;
  impact?: string;
  document: string | null;
  failureType: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  similarityScore: number;
  knowledgeConfidence: number;
  resolvedBy: string;
  managerApproved: boolean;
  playbookAvailable: boolean;
};

type IncidentsData = {
  incidents: Incident[];
  patterns: {
    id: string;
    title: string;
    assets: string[];
    description: string;
    confidence: number;
  }[];
  kpis: {
    historicalFailureCases: number;
    recurringFailurePatterns: number;
    expertValidatedCases: number;
    aiOperationalPlaybooks: number;
  };
};

const SEVERITY_FILTERS = ["All", "Critical", "High", "Medium", "Low"] as const;

export default function IncidentsPage() {
  const [data, setData] = useState<IncidentsData | null>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] =
    useState<(typeof SEVERITY_FILTERS)[number]>("All");
  const [machineFilter, setMachineFilter] = useState("All");
  const [playbookOnly, setPlaybookOnly] = useState(false);

  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const machines = useMemo(() => {
    const set = new Set((data?.incidents ?? []).map((i) => i.asset));
    return ["All", ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.incidents ?? []).filter((inc) => {
      if (severityFilter !== "All" && inc.severity !== severityFilter) return false;
      if (machineFilter !== "All" && inc.asset !== machineFilter) return false;
      if (playbookOnly && !inc.playbookAvailable) return false;
      if (!q) return true;
      return (
        inc.asset.toLowerCase().includes(q) ||
        inc.machineName.toLowerCase().includes(q) ||
        inc.summary.toLowerCase().includes(q) ||
        inc.failureType.toLowerCase().includes(q)
      );
    });
  }, [data, search, severityFilter, machineFilter, playbookOnly]);

  const kpis = data?.kpis;

  return (
    <PageShell
      title="Failure Intelligence"
      subtitle="Learn from previous failures, understand how they were solved and prevent recurring problems using Organizational Memory."
      hero={
        <HeroBand cols={4}>
          <HeroMetricCard
            label="Historical Failure Cases"
            value={kpis?.historicalFailureCases ?? "—"}
            icon={AlertTriangle}
          />
          <HeroMetricCard
            label="Recurring Failure Patterns"
            value={kpis?.recurringFailurePatterns ?? "—"}
            icon={Repeat}
            sparklineColor="#f59e0b"
          />
          <HeroMetricCard
            label="Expert Validated Cases"
            value={kpis?.expertValidatedCases ?? "—"}
            icon={ShieldCheck}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="AI Operational Playbooks"
            value={kpis?.aiOperationalPlaybooks ?? "—"}
            icon={BookOpen}
          />
        </HeroBand>
      }
    >
      <ContentCard title="Recurring Failure Patterns">
        <div className="grid gap-3 lg:grid-cols-2">
          {(data?.patterns ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-border/60 p-4 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium">{p.title}</p>
                <Badge variant="outline">{p.confidence}%</Badge>
              </div>
              <p className="mb-2 text-muted-foreground">{p.description}</p>
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

      <ContentCard title="Historical Failure Cases">
        <div className="mb-4 flex flex-col gap-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by machine, symptom, failure type or describe the issue..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <FilterPills
              options={SEVERITY_FILTERS.map((s) => ({ id: s, label: s }))}
              value={severityFilter}
              onChange={(v) => setSeverityFilter(v as (typeof SEVERITY_FILTERS)[number])}
            />
            <FilterPills
              options={machines.map((m) => ({ id: m, label: m }))}
              value={machineFilter}
              onChange={setMachineFilter}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={playbookOnly}
                onChange={(e) => setPlaybookOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              Playbook Available
            </label>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No historical failures match these filters.
            </p>
          )}
          {filtered.map((inc) => (
            <Link
              key={inc.id}
              href={`/incidents/${encodeURIComponent(inc.id)}?asset=${inc.asset}`}
              className="block card-rich rounded-xl border border-border/60 p-4 text-sm transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-primary">{inc.asset}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{inc.machineName}</span>
                <Badge
                  variant="outline"
                  className={`ml-auto ${SEVERITY_STYLES[inc.severity] ?? ""}`}
                >
                  {inc.severity}
                </Badge>
              </div>
              <p className="mt-2 font-medium">{inc.summary}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{inc.failureType}</Badge>
                {inc.date && (
                  <span className="text-xs text-muted-foreground">{inc.date}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Similarity {inc.similarityScore}%</span>
                <span>Knowledge Confidence {inc.knowledgeConfidence}%</span>
                <span>Resolved By {inc.resolvedBy}</span>
                {inc.managerApproved && (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
                    Manager Approved
                  </Badge>
                )}
                {inc.playbookAvailable && (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    Playbook Available
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </ContentCard>
    </PageShell>
  );
}
