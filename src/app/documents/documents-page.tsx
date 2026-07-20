"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { BookOpen, History, Users, FileCheck2, BrainCircuit, CheckCircle2 } from "lucide-react";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IngestResult } from "@/lib/ingest/types";

type RowStatus = "queued" | "processing" | "success" | "partial" | "error";

interface FileRow {
  name: string;
  status: RowStatus;
  result?: IngestResult;
  stage?: number;
}

// User-facing narrative for what happens on upload — no vectors, chunks, or
// embeddings in view. The real pipeline underneath is unchanged.
const PIPELINE_STAGES = [
  "Uploading Knowledge",
  "Extracting Equipment Information",
  "Identifying Engineers",
  "Connecting Historical Incidents",
  "Updating Knowledge Graph",
  "Generating AI Playbooks",
  "Organizational Memory Expanded",
];
const STAGE_INTERVAL_MS = 800; // 7 stages × 800ms ≈ 5.6s, within the 5–7s target

const STATUS_LABEL: Record<RowStatus, string> = {
  queued: "Queued",
  processing: "Processing…",
  success: "Available to AI",
  partial: "Partially Added",
  error: "Failed",
};

const STATUS_STYLES: Record<RowStatus, string> = {
  queued: "bg-muted text-muted-foreground border-transparent",
  processing: "bg-primary text-primary-foreground border-transparent animate-pulse",
  success: "bg-emerald-500 text-white border-transparent",
  partial: "bg-yellow-500 text-yellow-950 border-transparent",
  error: "bg-destructive text-destructive-foreground border-transparent",
};

const KNOWLEDGE_TYPES = [
  "SOPs",
  "Incident Reports",
  "Work Orders",
  "Maintenance Logs",
  "Vendor Manuals",
  "Expert Interviews",
  "Audit Reports",
];

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.tiff,.xlsx,.csv,.eml,.txt";

function StatusBadge({ status }: { status: RowStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABEL[status]}</Badge>;
}

type Stats = {
  documents: number;
  incidentsIndexed: number;
  expertsTracked: number;
  playbooksGenerated: number;
  knowledgeRiskScore: number;
};

export default function DocumentsPage() {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<FileRow | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastBatch, setLastBatch] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshStats = useCallback(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const updateRow = useCallback(
    (name: string, patch: Partial<FileRow>) =>
      setRows((prev) => prev.map((r) => (r.name === name ? { ...r, ...patch } : r))),
    []
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      const incoming = files.filter((f) => !rows.find((r) => r.name === f.name));
      if (incoming.length === 0) return;

      setLastBatch(incoming.map((f) => f.name));
      setRows((prev) => [
        ...prev,
        ...incoming.map((f): FileRow => ({ name: f.name, status: "queued", stage: 0 })),
      ]);

      for (const f of incoming) {
        updateRow(f.name, { status: "processing", stage: 0 });
        const stageTimer = setInterval(() => {
          setRows((prev) =>
            prev.map((r) =>
              r.name === f.name && r.status === "processing"
                ? { ...r, stage: Math.min((r.stage ?? 0) + 1, PIPELINE_STAGES.length - 1) }
                : r
            )
          );
        }, STAGE_INTERVAL_MS);
        try {
          const body = new FormData();
          body.append("files", f);
          const res = await fetch("/api/ingest", { method: "POST", body });
          const data: { results: IngestResult[] } = await res.json();
          const result = data.results[0];
          clearInterval(stageTimer);
          updateRow(f.name, {
            status: result?.status ?? "error",
            result,
            stage: PIPELINE_STAGES.length - 1,
          });
          if (result?.status === "error") {
            toast.error(`${f.name} couldn't be added`);
          }
        } catch {
          clearInterval(stageTimer);
          updateRow(f.name, { status: "error" });
          toast.error("Couldn't add knowledge — try again");
        }
      }
      refreshStats();
    },
    [rows, updateRow, refreshStats]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      processFiles(Array.from(e.dataTransfer.files));
    },
    [processFiles]
  );

  const processing = rows.some((r) => r.status === "processing");
  const coveragePercent = stats ? 100 - stats.knowledgeRiskScore : null;

  const batchRows = rows.filter((r) => lastBatch.includes(r.name));
  const batchDone =
    lastBatch.length > 0 && batchRows.every((r) => r.status !== "processing" && r.status !== "queued");
  const batchSuccessRows = batchRows.filter((r) => r.status === "success" || r.status === "partial");
  const batchNewEquipment = batchSuccessRows.reduce(
    (s, r) => s + (r.result?.entitiesFound.equipmentTags ?? 0),
    0
  );
  const batchNewRelationships = batchSuccessRows.reduce(
    (s, r) =>
      s + (r.result?.entitiesFound.regulatoryRefs ?? 0) + (r.result?.entitiesFound.personnel ?? 0),
    0
  );

  return (
    <PageShell
      title="Knowledge Repository"
      subtitle="Build your organization's memory by adding SOPs, incident reports, maintenance logs, work orders, expert interviews, audit reports and vendor manuals."
      maxWidth="lg"
      hero={
        <HeroBand cols={4}>
          <HeroMetricCard label="Knowledge Sources" value={stats?.documents ?? "—"} icon={BookOpen} />
          <HeroMetricCard label="Incident Reports" value={stats?.incidentsIndexed ?? "—"} icon={History} />
          <HeroMetricCard label="Expert Knowledge" value={stats?.expertsTracked ?? "—"} icon={Users} />
          <HeroMetricCard label="Operational Playbooks" value={stats?.playbooksGenerated ?? "—"} icon={FileCheck2} />
        </HeroBand>
      }
    >
      <ContentCard className="border-primary/30 bg-primary/5">
        <div className="flex items-center gap-4">
          <BrainCircuit className="h-8 w-8 text-primary shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Knowledge Coverage
            </p>
            <p className="font-heading text-3xl font-bold">
              {coveragePercent !== null ? `${coveragePercent}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Share of organizational knowledge captured from SOPs, incident reports,
              maintenance history, work orders, vendor manuals and expert experience.
            </p>
          </div>
        </div>
      </ContentCard>

      {processing && (
        <ContentCard title="Adding Knowledge…">
          <div className="flex flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const activeRow = rows.find((r) => r.status === "processing");
              const current = activeRow?.stage ?? 0;
              return (
                <Badge
                  key={stage}
                  variant="outline"
                  className={
                    i <= current ? "border-primary/50 text-primary" : "text-muted-foreground/70"
                  }
                >
                  {i + 1}. {stage}
                </Badge>
              );
            })}
          </div>
        </ContentCard>
      )}

      {batchDone && batchSuccessRows.length > 0 && (
        <ContentCard title="Knowledge Successfully Added" className="border-emerald-500/40 bg-emerald-500/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold font-heading">{batchSuccessRows.length}</p>
              <p className="text-xs text-muted-foreground">Knowledge Added</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-heading">{batchNewEquipment}</p>
              <p className="text-xs text-muted-foreground">New Equipment Identified</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-heading">{batchNewRelationships}</p>
              <p className="text-xs text-muted-foreground">New Relationships Found</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Knowledge Graph Updated
              </p>
              <p className="text-xs flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> AI Playbooks Improved
              </p>
            </div>
          </div>
        </ContentCard>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative card-rich border-2 border-dashed rounded-xl p-8 sm:p-14 text-center cursor-pointer transition-all ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPT} onChange={(e) => processFiles(Array.from(e.target.files ?? []))} className="sr-only" />
        <p className="text-lg font-semibold font-heading">
          {dragging ? "Release to add" : "Add Organizational Knowledge"}
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Upload SOPs, Incident Reports, Maintenance Logs, Work Orders, Expert
          Interviews, Vendor Manuals and Audit Reports.
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-4">
          {KNOWLEDGE_TYPES.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px] text-muted-foreground">
              ✓ {t}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/70 mt-3">
          PDF · XLSX · CSV · PNG · JPEG · EML · TXT
        </p>
      </div>

      {rows.length > 0 && (
        <ContentCard
          title={`Knowledge Added This Session (${rows.length})`}
          action={
            !processing ? (
              <Button variant="ghost" size="sm" onClick={() => { setRows([]); setLastBatch([]); }}>Clear</Button>
            ) : undefined
          }
        >
          <div className="divide-y border-t border-border/60 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5">
            {rows.map((row) => (
              <button
                key={row.name}
                type="button"
                onClick={() => row.result && setSelected(row)}
                className="w-full flex flex-col sm:grid sm:grid-cols-[1fr_140px_60px] gap-2 sm:gap-3 px-4 sm:px-5 py-3 items-start sm:items-center text-sm text-left hover:bg-muted/40"
              >
                <span className="truncate font-medium w-full">{row.name}</span>
                <div className="flex flex-wrap items-center gap-2 sm:contents">
                  <StatusBadge status={row.status} />
                  <span className="text-xs text-muted-foreground">
                    {row.result ? "Details →" : row.status === "processing" ? `${(row.stage ?? 0) + 1}/${PIPELINE_STAGES.length}` : "—"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ContentCard>
      )}

      {rows.some((r) => r.status === "success" || r.status === "partial") && (
        <ContentCard title="Recent Knowledge Added">
          <div className="space-y-2">
            {rows
              .filter((r) => r.status === "success" || r.status === "partial")
              .slice(-5)
              .reverse()
              .map((r) => (
                <p key={r.name} className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{r.name}</span>
                  {" → Knowledge Graph Updated → Available to Future Engineers"}
                </p>
              ))}
          </div>
        </ContentCard>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected?.result && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Knowledge Source</Badge>
                {selected.result.ocrApplied && <Badge variant="outline">Scanned document</Badge>}
              </div>
              <p><strong>Equipment identified:</strong> {selected.result.entitiesFound.equipmentTags ?? 0}</p>
              <p><strong>Regulations linked:</strong> {selected.result.entitiesFound.regulatoryRefs ?? 0}</p>
              <p><strong>People referenced:</strong> {selected.result.entitiesFound.personnel ?? 0}</p>
              {selected.result.error && (
                <p className="text-destructive text-xs">{selected.result.error}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
