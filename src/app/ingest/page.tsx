"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { IngestResult } from "@/lib/ingest/types";

type RowStatus = "queued" | "processing" | "success" | "partial" | "error";

interface FileRow {
  name: string;
  status: RowStatus;
  result?: IngestResult;
}

const STATUS_STYLES: Record<RowStatus, string> = {
  queued: "bg-muted text-muted-foreground border-transparent",
  processing: "bg-blue-500 text-white border-transparent animate-pulse",
  success: "bg-emerald-500 text-white border-transparent",
  partial: "bg-yellow-500 text-white border-transparent",
  error: "bg-destructive text-destructive-foreground border-transparent",
};

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.tiff,.xlsx,.csv,.eml,.txt";

function StatusBadge({ status }: { status: RowStatus }) {
  return (
    <Badge className={STATUS_STYLES[status]}>
      {status === "queued" ? "Queued" : null}
      {status === "processing" ? "Processing…" : null}
      {status === "success" ? "Done" : null}
      {status === "partial" ? "Partial" : null}
      {status === "error" ? "Error" : null}
    </Badge>
  );
}

function NumCell({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{value}</span>;
}

export default function IngestPage() {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateRow = useCallback(
    (name: string, patch: Partial<FileRow>) =>
      setRows((prev) => prev.map((r) => (r.name === name ? { ...r, ...patch } : r))),
    []
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      // Deduplicate against existing rows
      const incoming = files.filter((f) => !rows.find((r) => r.name === f.name));
      if (incoming.length === 0) return;

      setRows((prev) => [
        ...prev,
        ...incoming.map((f): FileRow => ({ name: f.name, status: "queued" })),
      ]);

      incoming.forEach((f) => updateRow(f.name, { status: "processing" }));

      const body = new FormData();
      incoming.forEach((f) => body.append("files", f));

      try {
        const res = await fetch("/api/ingest", { method: "POST", body });
        const data: { results: IngestResult[] } = await res.json();

        let failures = 0;
        for (const result of data.results) {
          if (result.status === "error") failures++;
          updateRow(result.fileName, {
            status: result.status,
            result,
          });
        }
        if (failures > 0) {
          toast.error(`${failures} file(s) failed to ingest`, {
            description: "Check the queue for per-file status.",
          });
        }
      } catch {
        incoming.forEach((f) =>
          updateRow(f.name, { status: "error", result: undefined })
        );
        toast.error("Ingestion request failed", {
          description: "Is the dev server running and a model key configured?",
        });
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

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const processing = rows.some((r) => r.status === "processing");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="max-w-5xl mx-auto w-full p-6 sm:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Document Ingestion</h1>
          <p className="text-muted-foreground">
            Upload industrial documents to parse, chunk, extract entities, and index
            them in Qdrant.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            "relative border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all duration-150 select-none",
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/40 hover:bg-muted/40",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={onInputChange}
            className="sr-only"
          />
          <p className="text-lg font-semibold">
            {dragging ? "Release to upload" : "Drop files here"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or{" "}
            <span className="text-primary underline underline-offset-2">click to browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            PDF · XLSX · CSV · PNG · JPEG · EML · TXT
          </p>
        </div>

        {/* Queue table */}
        {rows.length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Ingestion Queue{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  ({rows.length} file{rows.length !== 1 ? "s" : ""})
                </span>
              </CardTitle>
              {!processing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRows([])}
                  className="text-muted-foreground text-xs"
                >
                  Clear
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_120px_70px_80px_70px_80px_80px] gap-3 px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <span>File</span>
                <span>Status</span>
                <span className="text-right">Chunks</span>
                <span className="text-right">Equipment</span>
                <span className="text-right">Params</span>
                <span className="text-right">Refs</span>
                <span className="text-right">Personnel</span>
              </div>

              <div className="divide-y divide-border">
                {rows.map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[1fr_120px_70px_80px_70px_80px_80px] gap-3 px-6 py-3 items-center text-sm"
                  >
                    <span
                      className="truncate font-medium"
                      title={row.name}
                    >
                      {row.name}
                    </span>

                    <StatusBadge status={row.status} />

                    {row.status === "processing" ? (
                      <>
                        <Skeleton className="h-4 w-8 ml-auto" />
                        <Skeleton className="h-4 w-8 ml-auto" />
                        <Skeleton className="h-4 w-8 ml-auto" />
                        <Skeleton className="h-4 w-8 ml-auto" />
                        <Skeleton className="h-4 w-8 ml-auto" />
                      </>
                    ) : (
                      <>
                        <span className="text-right">
                          <NumCell value={row.result?.chunks} />
                        </span>
                        <span className="text-right">
                          <NumCell value={row.result?.entitiesFound.equipmentTags} />
                        </span>
                        <span className="text-right">
                          <NumCell value={row.result?.entitiesFound.processParameters} />
                        </span>
                        <span className="text-right">
                          <NumCell value={row.result?.entitiesFound.regulatoryRefs} />
                        </span>
                        <span className="text-right">
                          <NumCell value={row.result?.entitiesFound.personnel} />
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* OCR note */}
        {rows.some((r) => r.result?.ocrApplied) && (
          <p className="text-xs text-muted-foreground">
            * OCR was applied to one or more pages with sparse text layers.
          </p>
        )}
      </div>
    </div>
  );
}
