"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildAuditPack } from "@/lib/agents/audit-pack";
import type {
  ComplianceReport,
  RequirementVerdict,
  Verdict,
  EvidenceCitation,
} from "@/lib/agents/compliance-types";

const VERDICTS: Verdict[] = ["COVERED", "PARTIAL", "GAP", "UNKNOWN"];

const VERDICT_STYLES: Record<Verdict, string> = {
  COVERED: "bg-emerald-500 text-white border-transparent",
  PARTIAL: "bg-amber-500 text-white border-transparent",
  GAP: "bg-destructive text-destructive-foreground border-transparent",
  UNKNOWN: "bg-slate-500 text-white border-transparent",
};

const TILE_STYLES: Record<Verdict, string> = {
  COVERED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  PARTIAL: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  GAP: "border-destructive/30 bg-destructive/10 text-destructive",
  UNKNOWN: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

// Sort order: most severe first
const VERDICT_RANK: Record<Verdict, number> = {
  GAP: 0,
  PARTIAL: 1,
  UNKNOWN: 2,
  COVERED: 3,
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge className={`text-xs ${VERDICT_STYLES[verdict]}`}>{verdict}</Badge>;
}

function EvidenceDialog({
  citation,
  requirementId,
  onClose,
}: {
  citation: EvidenceCitation | null;
  requirementId: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!citation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="font-mono text-primary">[{citation?.n}]</span>
            {citation?.fileName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              Requirement:{" "}
              <strong className="text-foreground font-mono">{requirementId}</strong>
            </span>
            <span>
              Section / Page:{" "}
              <strong className="text-foreground">{citation?.page}</strong>
            </span>
            <span>
              Similarity:{" "}
              <strong className="text-foreground">
                {((citation?.score ?? 0) * 100).toFixed(1)}%
              </strong>
            </span>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-foreground border border-border">
            {citation?.snippet}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  verdict,
  count,
  total,
  active,
  onClick,
}: {
  verdict: Verdict;
  count: number;
  total: number;
  active: boolean;
  onClick: () => void;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
        TILE_STYLES[verdict]
      } ${active ? "ring-2 ring-offset-2 ring-offset-background ring-current" : "hover:scale-[1.02]"}`}
    >
      <span className="text-3xl font-bold tabular-nums">{count}</span>
      <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
        {verdict}
      </span>
      <span className="text-[11px] opacity-70">{pct}% of corpus</span>
    </button>
  );
}

type SortKey = "severity" | "id" | "category";

export default function CompliancePage() {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verdictFilter, setVerdictFilter] = useState<Verdict | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("severity");

  const [activeCitation, setActiveCitation] = useState<{
    citation: EvidenceCitation;
    requirementId: string;
  } | null>(null);

  // Load cached report on mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/compliance/scan")
      .then((r) => r.json())
      .then((data) => {
        if (data.report) setReport(data.report);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/compliance/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setReport(data.report);
      const s = data.report.summary;
      toast.success("Compliance scan complete", {
        description: `${s.COVERED} covered · ${s.PARTIAL} partial · ${s.GAP} gap · ${s.UNKNOWN} unknown`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed";
      setError(message);
      toast.error("Compliance scan failed", { description: message });
    } finally {
      setScanning(false);
    }
  }, []);

  const coveredCount = report?.summary.COVERED ?? 0;

  const exportAuditPack = useCallback(() => {
    if (!report) return;
    const pack = buildAuditPack(report, new Date().toISOString());
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `iki-audit-pack-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Audit pack exported", {
      description: `${pack.certifiedCount} certified requirement(s) written to ${a.download}`,
    });
  }, [report]);

  const categories = useMemo(
    () =>
      report
        ? [...new Set(report.results.map((r) => r.category))].sort()
        : [],
    [report]
  );

  const filtered = useMemo(() => {
    if (!report) return [];
    const term = search.trim().toLowerCase();
    const rows = report.results.filter((r) => {
      if (verdictFilter !== "ALL" && r.verdict !== verdictFilter) return false;
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      if (
        term &&
        !r.requirementText.toLowerCase().includes(term) &&
        !r.requirementId.toLowerCase().includes(term) &&
        !r.source.toLowerCase().includes(term)
      )
        return false;
      return true;
    });

    const sorted = [...rows];
    if (sortKey === "severity") {
      sorted.sort((a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict]);
    } else if (sortKey === "id") {
      sorted.sort((a, b) => a.requirementId.localeCompare(b.requirementId));
    } else {
      sorted.sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.requirementId.localeCompare(b.requirementId)
      );
    }
    return sorted;
  }, [report, verdictFilter, categoryFilter, search, sortKey]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />

      {/* Toolbar */}
      <div className="border-b border-border px-4 sm:px-6 py-2.5 flex items-center gap-3 bg-background/80 backdrop-blur-sm">
        <h2 className="font-semibold text-sm hidden sm:block">
          Compliance Dashboard
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {report && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Last scan: {new Date(report.generatedAt).toLocaleString()}
            </span>
          )}
          {report && (
            <Button
              size="sm"
              variant="outline"
              onClick={exportAuditPack}
              disabled={coveredCount === 0}
              title={
                coveredCount === 0
                  ? "No COVERED requirements to export"
                  : `Export ${coveredCount} certified requirement(s)`
              }
            >
              Export Audit Pack
            </Button>
          )}
          <Button size="sm" onClick={runScan} disabled={scanning}>
            {scanning ? "Scanning…" : report ? "Re-run scan" : "Run scan"}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Intro */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Regulatory Compliance Gap Detection
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Each requirement is checked against retrieved evidence from the corpus.
            Verdicts are conservative — a requirement with no relevant evidence is
            reported as UNKNOWN, never as a false gap.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Loading / empty / scanning states */}
        {loading && !report && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {VERDICTS.map((v) => (
              <Skeleton key={v} className="h-24 rounded-xl" />
            ))}
          </div>
        )}

        {!loading && !report && !scanning && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground text-sm max-w-sm">
              No compliance report yet. Run a scan to evaluate all{" "}
              requirements against the ingested corpus.
            </p>
            <Button onClick={runScan} disabled={scanning}>
              Run first scan
            </Button>
          </div>
        )}

        {scanning && !report && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="space-y-2 w-64">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5 mx-auto" />
              <Skeleton className="h-3 w-3/5 mx-auto" />
            </div>
            <p className="text-muted-foreground text-sm">
              Evaluating requirements against corpus evidence…
            </p>
          </div>
        )}

        {report && (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {VERDICTS.map((v) => (
                <SummaryTile
                  key={v}
                  verdict={v}
                  count={report.summary[v]}
                  total={report.totalRequirements}
                  active={verdictFilter === v}
                  onClick={() =>
                    setVerdictFilter((cur) => (cur === v ? "ALL" : v))
                  }
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requirements…"
                className="h-8 rounded-md border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring flex-1 min-w-[180px]"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-muted px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={verdictFilter}
                onChange={(e) =>
                  setVerdictFilter(e.target.value as Verdict | "ALL")
                }
                className="h-8 rounded-md border border-border bg-muted px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All verdicts</option>
                {VERDICTS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="h-8 rounded-md border border-border bg-muted px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="severity">Sort: severity</option>
                <option value="id">Sort: ID</option>
                <option value="category">Sort: category</option>
              </select>
              <span className="text-xs text-muted-foreground ml-auto">
                {filtered.length} of {report.totalRequirements}
              </span>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-semibold px-3 py-2 w-20">ID</th>
                      <th className="text-left font-semibold px-3 py-2 w-28">
                        Verdict
                      </th>
                      <th className="text-left font-semibold px-3 py-2">
                        Requirement
                      </th>
                      <th className="text-left font-semibold px-3 py-2 w-40">
                        Evidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((row) => (
                      <ComplianceRow
                        key={row.requirementId}
                        row={row}
                        onCite={(citation) =>
                          setActiveCitation({
                            citation,
                            requirementId: row.requirementId,
                          })
                        }
                      />
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-10 text-center text-muted-foreground text-sm"
                        >
                          No requirements match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <EvidenceDialog
        citation={activeCitation?.citation ?? null}
        requirementId={activeCitation?.requirementId ?? ""}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}

function ComplianceRow({
  row,
  onCite,
}: {
  row: RequirementVerdict;
  onCite: (c: EvidenceCitation) => void;
}) {
  return (
    <tr className="align-top hover:bg-muted/30 transition-colors">
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
        {row.requirementId}
      </td>
      <td className="px-3 py-3">
        <VerdictBadge verdict={row.verdict} />
      </td>
      <td className="px-3 py-3">
        <p className="text-foreground leading-snug">{row.requirementText}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-[11px] text-muted-foreground">{row.source}</span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">{row.category}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          <span className="font-semibold text-foreground/80">Rationale: </span>
          {row.rationale}
        </p>
      </td>
      <td className="px-3 py-3">
        {row.evidence.length > 0 ? (
          <div className="flex flex-col gap-1">
            {row.evidence.map((e) => (
              <button
                key={e.n}
                onClick={() => onCite(e)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-xs text-muted-foreground border border-border transition-colors text-left"
                title={`${e.fileName} · ${(e.score * 100).toFixed(0)}%`}
              >
                <span className="font-mono font-semibold text-foreground">
                  [{e.n}]
                </span>
                <span className="truncate max-w-[130px]">{e.fileName}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
