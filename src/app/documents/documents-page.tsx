"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FileText, Layers, Network } from "lucide-react";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";
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

const PIPELINE_STAGES = [
  "Upload received",
  "Text extraction",
  "OCR (if needed)",
  "Chunking",
  "Entity extraction",
  "RCA extraction",
  "Embedding",
  "Vector indexing",
  "Graph build",
];

const STATUS_STYLES: Record<RowStatus, string> = {
  queued: "bg-muted text-muted-foreground border-transparent",
  processing: "bg-blue-500 text-white border-transparent animate-pulse",
  success: "bg-emerald-500 text-white border-transparent",
  partial: "bg-yellow-500 text-white border-transparent",
  error: "bg-destructive text-destructive-foreground border-transparent",
};

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.tiff,.xlsx,.csv,.eml,.txt";

function StatusBadge({ status }: { status: RowStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}

function NumCell({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{value}</span>;
}

export default function DocumentsPage() {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<FileRow | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateRow = useCallback(
    (name: string, patch: Partial<FileRow>) =>
      setRows((prev) => prev.map((r) => (r.name === name ? { ...r, ...patch } : r))),
    []
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      const incoming = files.filter((f) => !rows.find((r) => r.name === f.name));
      if (incoming.length === 0) return;

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
        }, 600);
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
            toast.error(`${f.name} failed to ingest`);
          }
        } catch {
          clearInterval(stageTimer);
          updateRow(f.name, { status: "error" });
          toast.error("Ingestion request failed");
        }
      }
    },
    [rows, updateRow]
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
  const totalChunks = rows.reduce((s, r) => s + (r.result?.chunks ?? 0), 0);
  const totalEntities = rows.reduce(
    (s, r) =>
      s +
      (r.result?.entitiesFound.equipmentTags ?? 0) +
      (r.result?.entitiesFound.regulatoryRefs ?? 0) +
      (r.result?.entitiesFound.personnel ?? 0),
    0
  );

  return (
    <PageShell
      title="Document Intelligence"
      subtitle="Upload industrial documents — parse, extract entities, index vectors, and build the knowledge graph."
      maxWidth="lg"
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Documents Indexed"
            value={rows.length || 31}
            icon={FileText}
            trend={12}
            sparklineData={sparklineFromSeed(rows.length || 31)}
          />
          <HeroMetricCard
            label="Chunks Created"
            value={totalChunks || 842}
            icon={Layers}
            trend={8}
            sparklineData={sparklineFromSeed(totalChunks || 842)}
          />
          <HeroMetricCard
            label="Entities Extracted"
            value={totalEntities || 156}
            icon={Network}
            trend={15}
            sparklineData={sparklineFromSeed(totalEntities || 156)}
            sparklineColor="#10b981"
          />
        </HeroBand>
      }
    >
      {processing && (
        <ContentCard title="Processing Pipeline">
          <div className="flex flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const activeRow = rows.find((r) => r.status === "processing");
              const current = activeRow?.stage ?? 0;
              return (
                <Badge
                  key={stage}
                  variant="outline"
                  className={
                    i <= current
                      ? "border-primary/50 text-primary"
                      : "text-muted-foreground/40"
                  }
                >
                  {i + 1}. {stage}
                </Badge>
              );
            })}
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
        <p className="text-lg font-semibold font-heading">{dragging ? "Release to upload" : "Drop files here"}</p>
        <p className="text-sm text-muted-foreground mt-1">PDF · XLSX · CSV · PNG · JPEG · EML · TXT</p>
      </div>

      {rows.length > 0 && (
        <ContentCard
          title={`Ingestion Queue (${rows.length})`}
          action={
            !processing ? (
              <Button variant="ghost" size="sm" onClick={() => setRows([])}>Clear</Button>
            ) : undefined
          }
        >
          <div className="divide-y border-t border-border/60 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5">
            {rows.map((row) => (
              <button
                key={row.name}
                type="button"
                onClick={() => row.result && setSelected(row)}
                className="w-full flex flex-col sm:grid sm:grid-cols-[1fr_100px_60px_60px] gap-2 sm:gap-3 px-4 sm:px-5 py-3 items-start sm:items-center text-sm text-left hover:bg-muted/40"
              >
                <span className="truncate font-medium w-full">{row.name}</span>
                <div className="flex flex-wrap items-center gap-2 sm:contents">
                  <StatusBadge status={row.status} />
                  <span className="tabular-nums text-muted-foreground sm:text-foreground">
                    <span className="sm:hidden text-xs mr-1">Chunks:</span>
                    <NumCell value={row.result?.chunks} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.result ? "Details →" : row.status === "processing" ? `${(row.stage ?? 0) + 1}/9` : "—"}
                  </span>
                </div>
              </button>
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
                <Badge variant="outline">Document</Badge>
                {selected.result.ocrApplied && <Badge variant="outline">OCR applied</Badge>}
              </div>
              <p><strong>Chunks:</strong> {selected.result.chunks}</p>
              <p><strong>Equipment tags:</strong> {selected.result.entitiesFound.equipmentTags ?? 0}</p>
              <p><strong>Regulatory refs:</strong> {selected.result.entitiesFound.regulatoryRefs ?? 0}</p>
              <p><strong>Personnel:</strong> {selected.result.entitiesFound.personnel ?? 0}</p>
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
