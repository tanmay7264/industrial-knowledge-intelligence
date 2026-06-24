"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
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
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Download,
  RefreshCw,
  Search,
  SlidersHorizontal,
  FileCheck2,
} from "lucide-react";

const VERDICTS: Verdict[] = ["COVERED", "PARTIAL", "GAP", "UNKNOWN"];

const VERDICT_META: Record<
  Verdict,
  { color: string; bg: string; border: string; icon: React.ElementType; chart: string }
> = {
  COVERED: {
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: ShieldCheck,
    chart: "#10b981",
  },
  PARTIAL: {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
    chart: "#f59e0b",
  },
  GAP: {
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: AlertCircle,
    chart: "#ef4444",
  },
  UNKNOWN: {
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    icon: HelpCircle,
    chart: "#64748b",
  },
};

const VERDICT_BADGE: Record<Verdict, string> = {
  COVERED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-700 border border-amber-200",
  GAP: "bg-red-50 text-red-700 border border-red-200",
  UNKNOWN: "bg-slate-100 text-slate-600 border border-slate-200",
};

const VERDICT_RANK: Record<Verdict, number> = {
  GAP: 0, PARTIAL: 1, UNKNOWN: 2, COVERED: 3,
};

type SortKey = "severity" | "id" | "category";

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
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
  const m = VERDICT_META[verdict];
  const Icon = m.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col gap-3 rounded-2xl border p-5 text-left transition-all duration-200 hover:scale-[1.02] ${m.bg} ${m.border} ${
        active ? "ring-2 ring-offset-2 ring-offset-background ring-current scale-[1.02]" : ""
      }`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.bg} border ${m.border}`}>
        <Icon className={`h-4 w-4 ${m.color}`} />
      </div>
      <div>
        <p className={`text-3xl font-bold tabular-nums tracking-tight ${m.color}`}>{count}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {verdict}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            style={{ background: m.chart }}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{pct}%</span>
      </div>
    </button>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${VERDICT_BADGE[verdict]}`}>
      {verdict}
    </span>
  );
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
      <DialogContent className="max-w-lg border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="font-mono text-primary">[{citation?.n}]</span>
            <span className="truncate">{citation?.fileName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              Requirement:{" "}
              <strong className="text-foreground font-mono">{requirementId}</strong>
            </span>
            <span>
              Section:{" "}
              <strong className="text-foreground">{citation?.page}</strong>
            </span>
            <span>
              Match:{" "}
              <strong className="text-foreground">
                {((citation?.score ?? 0) * 100).toFixed(1)}%
              </strong>
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
            {citation?.snippet}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FindingRow({
  row,
  onCite,
}: {
  row: RequirementVerdict;
  onCite: (c: EvidenceCitation) => void;
}) {
  const m = VERDICT_META[row.verdict];
  return (
    <div className="group flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors border-b border-border/40 last:border-0">
      {/* Verdict indicator */}
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${m.bg} border ${m.border}`}>
        <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-muted-foreground">{row.requirementId}</span>
            <VerdictPill verdict={row.verdict} />
            <span className="text-[10px] text-muted-foreground">{row.category}</span>
          </div>
        </div>
        <p className="mt-1 text-sm text-foreground leading-snug line-clamp-2">{row.requirementText}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          <span className="font-medium text-foreground/60">Rationale: </span>
          {row.rationale}
        </p>
      </div>

      {/* Evidence chips */}
      <div className="shrink-0 flex flex-col gap-1 items-end">
        {row.evidence.length > 0 ? (
          row.evidence.slice(0, 2).map((e) => (
            <button
              key={e.n}
              onClick={() => onCite(e)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/60 text-[10px] text-muted-foreground transition-colors"
              title={`${e.fileName} · ${(e.score * 100).toFixed(0)}%`}
            >
              <FileCheck2 className="h-2.5 w-2.5" />
              <span className="font-mono font-semibold text-foreground">[{e.n}]</span>
            </button>
          ))
        ) : (
          <span className="text-[10px] text-muted-foreground/50">no evidence</span>
        )}
      </div>
    </div>
  );
}

// ── Custom donut label ───────────────────────────────────────────────────────

function DonutCenter({ total }: { total: number }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan
        x="50%"
        dy="-8"
        className="fill-foreground"
        style={{ fontSize: 28, fontWeight: 700, fill: "white" }}
      >
        {total}
      </tspan>
      <tspan
        x="50%"
        dy="22"
        style={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
      >
        requirements
      </tspan>
    </text>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    setLoading(true);
    fetch("/api/compliance/scan")
      .then((r) => r.json())
      .then((data) => { if (data.report) setReport(data.report); })
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

  const exportAuditPack = useCallback(() => {
    if (!report) return;
    const pack = buildAuditPack(report, new Date().toISOString());
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
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
      description: `${pack.certifiedCount} certified requirement(s) exported`,
    });
  }, [report]);

  const categories = useMemo(
    () => (report ? [...new Set(report.results.map((r) => r.category))].sort() : []),
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
    if (sortKey === "severity") sorted.sort((a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict]);
    else if (sortKey === "id") sorted.sort((a, b) => a.requirementId.localeCompare(b.requirementId));
    else sorted.sort((a, b) => a.category.localeCompare(b.category) || a.requirementId.localeCompare(b.requirementId));
    return sorted;
  }, [report, verdictFilter, categoryFilter, search, sortKey]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return VERDICTS.filter((v) => report.summary[v] > 0).map((v) => ({
      name: v,
      value: report.summary[v],
      color: VERDICT_META[v].chart,
    }));
  }, [report]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Page header ── */}
      <div className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-md px-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">Compliance Dashboard</h1>
          <span className="text-border">·</span>
          <span className="text-xs text-muted-foreground">OISD · Factory Act · PESO</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {report && (
            <span className="hidden sm:inline text-[11px] text-muted-foreground">
              Last scan: {new Date(report.generatedAt).toLocaleString()}
            </span>
          )}
          {report && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={exportAuditPack}
              disabled={report.summary.COVERED === 0}
            >
              <Download className="h-3 w-3" />
              Export Pack
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={runScan}
            disabled={scanning}
          >
            <RefreshCw className={`h-3 w-3 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning…" : report ? "Re-run" : "Run Scan"}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && !report && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {VERDICTS.map((v) => <Skeleton key={v} className="h-32 rounded-2xl" />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !report && !scanning && (
          <div className="flex flex-col items-center justify-center gap-5 py-28 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold">No compliance report yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Run a scan to evaluate all requirements against the ingested corpus. Verdicts are conservative — no false positives.
              </p>
            </div>
            <Button onClick={runScan} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Run first scan
            </Button>
          </div>
        )}

        {/* ── Scanning placeholder ── */}
        {scanning && !report && (
          <div className="flex flex-col items-center justify-center gap-5 py-28 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <RefreshCw className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Evaluating requirements…</p>
              <p className="text-xs text-muted-foreground">Checking evidence across the corpus. This takes ~45 seconds.</p>
            </div>
          </div>
        )}

        {report && (
          <>
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {VERDICTS.map((v) => (
                <StatCard
                  key={v}
                  verdict={v}
                  count={report.summary[v]}
                  total={report.totalRequirements}
                  active={verdictFilter === v}
                  onClick={() => setVerdictFilter((cur) => (cur === v ? "ALL" : v))}
                />
              ))}
            </div>

            {/* ── Main content grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* ── Findings list (2/3) ── */}
              <div className="xl:col-span-2 flex flex-col gap-3">
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-3">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search requirements…"
                      className="h-8 w-full rounded-lg border border-border/60 bg-muted/40 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-8 rounded-lg border border-border/60 bg-muted/40 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ALL">All categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="h-8 rounded-lg border border-border/60 bg-muted/40 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="severity">Severity</option>
                    <option value="id">ID</option>
                    <option value="category">Category</option>
                  </select>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                    {filtered.length}/{report.totalRequirements}
                  </span>
                </div>

                {/* List */}
                <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Requirements
                    </h3>
                    {verdictFilter !== "ALL" && (
                      <Badge
                        className={`text-[10px] cursor-pointer ${VERDICT_BADGE[verdictFilter as Verdict]}`}
                        onClick={() => setVerdictFilter("ALL")}
                      >
                        {verdictFilter} ×
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-[540px] overflow-y-auto">
                    {filtered.map((row) => (
                      <FindingRow
                        key={row.requirementId}
                        row={row}
                        onCite={(citation) =>
                          setActiveCitation({ citation, requirementId: row.requirementId })
                        }
                      />
                    ))}
                    {filtered.length === 0 && (
                      <div className="py-14 text-center text-sm text-muted-foreground">
                        No requirements match the current filters.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Right panel: chart + meta (1/3) ── */}
              <div className="flex flex-col gap-4">
                {/* Donut chart */}
                <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Verdict Distribution
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {report.totalRequirements} total
                    </span>
                  </div>

                  <div className="relative h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#0d1117",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                          formatter={(value, name) => [String(value), String(name)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold tabular-nums">{report.totalRequirements}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">requirements</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {VERDICTS.map((v) => {
                      const m = VERDICT_META[v];
                      const count = report.summary[v];
                      const pct = Math.round((count / report.totalRequirements) * 100);
                      return (
                        <button
                          key={v}
                          onClick={() => setVerdictFilter((cur) => (cur === v ? "ALL" : v))}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04] ${
                            verdictFilter === v ? "bg-white/[0.06]" : ""
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ background: m.chart }}
                          />
                          <div>
                            <p className={`text-[10px] font-semibold ${m.color}`}>{v}</p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              {count} · {pct}%
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scan metadata */}
                <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Scan Info
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Generated</span>
                      <span className="font-medium tabular-nums">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium tabular-nums">
                        {new Date(report.generatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Requirements</span>
                      <span className="font-medium tabular-nums">{report.totalRequirements}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Categories</span>
                      <span className="font-medium tabular-nums">{categories.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Gap rate</span>
                      <span className={`font-semibold tabular-nums ${report.summary.GAP > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {Math.round((report.summary.GAP / report.totalRequirements) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      className="w-full h-9 text-xs gap-2"
                      onClick={runScan}
                      disabled={scanning}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} />
                      {scanning ? "Scanning…" : "Re-run Scan"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-9 text-xs gap-2"
                      onClick={exportAuditPack}
                      disabled={report.summary.COVERED === 0}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export Audit Pack
                    </Button>
                  </div>
                </div>
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
