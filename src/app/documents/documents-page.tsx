"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <div className="max-w-5xl mx-auto w-full p-6 sm:p-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Document Intelligence</h1>
        <p className="text-muted-foreground">
          Upload industrial documents — parse, extract entities, index vectors, and build the knowledge graph.
        </p>
      </div>

      {processing && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Processing Pipeline</p>
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
        </Card>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPT} onChange={(e) => processFiles(Array.from(e.target.files ?? []))} className="sr-only" />
        <p className="text-lg font-semibold">{dragging ? "Release to upload" : "Drop files here"}</p>
        <p className="text-sm text-muted-foreground mt-1">PDF · XLSX · CSV · PNG · JPEG · EML · TXT</p>
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ingestion Queue ({rows.length})</CardTitle>
            {!processing && (
              <Button variant="ghost" size="sm" onClick={() => setRows([])}>Clear</Button>
            )}
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {rows.map((row) => (
              <button
                key={row.name}
                type="button"
                onClick={() => row.result && setSelected(row)}
                className="w-full grid grid-cols-[1fr_100px_60px_60px] gap-3 px-6 py-3 items-center text-sm text-left hover:bg-muted/40"
              >
                <span className="truncate font-medium">{row.name}</span>
                <StatusBadge status={row.status} />
                <NumCell value={row.result?.chunks} />
                <span className="text-xs text-muted-foreground">
                  {row.result ? "Details →" : row.status === "processing" ? `${(row.stage ?? 0) + 1}/9` : "—"}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
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
    </div>
  );
}
