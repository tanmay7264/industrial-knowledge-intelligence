"use client";

import { TopNav } from "@/components/top-nav";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubgraphView } from "@/components/subgraph-view";
import type { Source, ConfidenceLevel } from "@/lib/rag/answer";
import type { SubgraphData } from "@/lib/graph/types";
import type { RetrievalMode } from "@/lib/rag/router";
import type { ComplianceReport, Verdict } from "@/lib/agents/compliance-types";

type StepStatus = "idle" | "running" | "done" | "error";

interface ChatResult {
  answer: string;
  sources: Source[];
  confidence?: ConfidenceLevel;
  mode?: RetrievalMode;
  latencyMs?: number;
  subgraph?: SubgraphData | null;
}

interface DemoStep {
  id: string;
  kind: "chat" | "compliance";
  title: string;
  query?: string;
  criterion: string;
  caption: string;
}

const STEPS: DemoStep[] = [
  {
    id: "factual",
    kind: "chat",
    title: "Factual lookup with citations",
    query:
      "What is the preventive maintenance interval for the mechanical seal on hydraulic pump P-101?",
    criterion: "Technical Excellence + UX",
    caption:
      "Grounded answer with an inline [n] citation and a confidence score — every claim traces back to a source document.",
  },
  {
    id: "graph",
    kind: "chat",
    title: "Multi-hop graph query",
    query:
      "Which regulations govern pressure vessel V-201, and which documents mention it?",
    criterion: "Innovation",
    caption:
      "A relationship question pure vector RAG can't answer. The router picks graph/hybrid and returns the connected subgraph — equipment → regulation → documents.",
  },
  {
    id: "abstain",
    kind: "chat",
    title: "Honest abstain (no hallucination)",
    query: "What is the resale value of the plant manager's company car?",
    criterion: "Business Impact (trust)",
    caption:
      "Off-corpus question. IKI answers “Not found in the knowledge base” instead of inventing — the honesty a safety-critical buyer requires.",
  },
  {
    id: "compliance",
    kind: "compliance",
    title: "Compliance gap scan",
    criterion: "Business Impact",
    caption:
      "An agent checks every regulatory requirement against corpus evidence and returns Covered / Partial / Gap / Unknown — conservatively, with citations.",
  },
];

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  High: "bg-emerald-500 text-white border-transparent",
  Medium: "bg-yellow-500 text-white border-transparent",
  Low: "bg-destructive text-destructive-foreground border-transparent",
};

const MODE_STYLES: Record<RetrievalMode, string> = {
  vector: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  graph: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  hybrid: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
};

const VERDICT_TILE: Record<Verdict, string> = {
  COVERED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  PARTIAL: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  GAP: "border-destructive/30 bg-destructive/10 text-destructive",
  UNKNOWN: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

const VERDICTS: Verdict[] = ["COVERED", "PARTIAL", "GAP", "UNKNOWN"];

async function runChatQuery(
  query: string,
  onText: (full: string) => void
): Promise<ChatResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const result: ChatResult = { answer: "", sources: [] };

  const ct = res.headers.get("Content-Type") ?? "";
  if (ct.includes("application/json")) {
    const data = await res.json();
    result.answer = data.answer;
    result.sources = data.sources ?? [];
    result.confidence = data.confidence;
    result.mode = data.mode;
    result.latencyMs = data.latencyMs;
    result.subgraph = data.subgraph ?? null;
    onText(result.answer);
    return result;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const block of events) {
      const lines = block.split("\n");
      const ev = lines.find((l) => l.startsWith("event: "))?.slice(7).trim();
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (!ev || !dataLine) continue;
      const payload = JSON.parse(dataLine.slice(6));
      if (ev === "meta") {
        result.sources = payload.sources ?? [];
        result.subgraph = payload.subgraph ?? null;
        result.mode = payload.mode;
      } else if (ev === "text") {
        result.answer += payload.chunk as string;
        onText(result.answer);
      } else if (ev === "done") {
        result.confidence = payload.confidence;
        result.latencyMs = payload.latencyMs;
        result.mode = payload.mode ?? result.mode;
      }
    }
  }
  return result;
}

export default function DemoPage() {
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [chatResults, setChatResults] = useState<Record<string, ChatResult>>({});
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [activeSource, setActiveSource] = useState<Source | null>(null);

  const setStatus = (id: string, s: StepStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: s }));

  const runStep = useCallback(async (step: DemoStep) => {
    setStatus(step.id, "running");
    try {
      if (step.kind === "chat" && step.query) {
        const res = await runChatQuery(step.query, (full) =>
          setChatResults((prev) => ({
            ...prev,
            [step.id]: { ...(prev[step.id] ?? { sources: [] }), answer: full },
          }))
        );
        setChatResults((prev) => ({ ...prev, [step.id]: res }));
      } else {
        // Prefer a cached report so the slowest step replays instantly on stage;
        // only run a fresh scan if nothing is cached yet.
        const cached = await fetch("/api/compliance/scan")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (cached?.report) {
          setReport(cached.report);
        } else {
          const r = await fetch("/api/compliance/scan", { method: "POST" });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
          setReport(data.report);
        }
      }
      setStatus(step.id, "done");
    } catch {
      setStatus(step.id, "error");
      toast.error(`Demo step failed: ${step.title}`, {
        description:
          "Ensure the corpus is seeded (npm run seed) and model keys are set.",
      });
    }
  }, []);

  const runAll = useCallback(async () => {
    for (const step of STEPS) {
      // eslint-disable-next-line no-await-in-loop
      await runStep(step);
    }
  }, [runStep]);

  const anyRunning = Object.values(statuses).some((s) => s === "running");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Intro */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Guided Demo</h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Four steps, each mapped to a judging criterion. Run them one at a
              time to narrate, or play the whole sequence.
            </p>
          </div>
          <Button onClick={runAll} disabled={anyRunning} className="shrink-0">
            {anyRunning ? "Running…" : "▶ Run all 4 steps"}
          </Button>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const status = statuses[step.id] ?? "idle";
            const chat = chatResults[step.id];
            return (
              <div
                key={step.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Step header */}
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-sm">{step.title}</h2>
                      <Badge variant="outline" className="text-[10px]">
                        {step.criterion}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {step.caption}
                    </p>
                    {step.query && (
                      <p className="mt-2 text-sm italic text-foreground/80">
                        “{step.query}”
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={status === "done" ? "outline" : "default"}
                    onClick={() => runStep(step)}
                    disabled={status === "running"}
                    className="shrink-0"
                  >
                    {status === "running"
                      ? "…"
                      : status === "done"
                        ? "Re-run"
                        : "Run"}
                  </Button>
                </div>

                {/* Step result */}
                {(status === "running" || status === "done" || chat) && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                    {step.kind === "chat" ? (
                      <ChatStepResult
                        status={status}
                        chat={chat}
                        confStyles={CONFIDENCE_STYLES}
                        modeStyles={MODE_STYLES}
                        onSource={setActiveSource}
                      />
                    ) : (
                      <ComplianceStepResult status={status} report={report} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SourceDialog source={activeSource} onClose={() => setActiveSource(null)} />
    </div>
  );
}

function ChatStepResult({
  status,
  chat,
  confStyles,
  modeStyles,
  onSource,
}: {
  status: StepStatus;
  chat?: ChatResult;
  confStyles: Record<ConfidenceLevel, string>;
  modeStyles: Record<RetrievalMode, string>;
  onSource: (s: Source) => void;
}) {
  if (status === "running" && !chat?.answer) {
    return (
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }
  if (!chat) return null;

  return (
    <>
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.answer}</ReactMarkdown>
      </div>

      {chat.subgraph && chat.subgraph.nodes.length > 0 && (
        <SubgraphView data={chat.subgraph} height={220} width={640} className="max-w-full" />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {chat.confidence && (
          <Badge className={`text-xs ${confStyles[chat.confidence]}`}>
            {chat.confidence} confidence
          </Badge>
        )}
        {chat.mode && (
          <Badge variant="outline" className={`text-xs ${modeStyles[chat.mode]}`}>
            {chat.mode}
          </Badge>
        )}
        {chat.latencyMs && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {(chat.latencyMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {chat.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chat.sources.map((s) => (
            <button
              key={s.n}
              onClick={() => onSource(s)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-xs text-muted-foreground border border-border transition-colors"
            >
              <span className="font-mono font-semibold text-foreground">[{s.n}]</span>
              <span className="truncate max-w-[140px]">{s.fileName}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ComplianceStepResult({
  status,
  report,
}: {
  status: StepStatus;
  report: ComplianceReport | null;
}) {
  if (status === "running" && !report) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {VERDICTS.map((v) => (
          <Skeleton key={v} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }
  if (!report) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {VERDICTS.map((v) => (
          <div
            key={v}
            className={`rounded-lg border p-2 text-center ${VERDICT_TILE[v]}`}
          >
            <div className="text-xl font-bold tabular-nums">{report.summary[v]}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              {v}
            </div>
          </div>
        ))}
      </div>
      <a
        href="/compliance"
        className="inline-block text-xs text-primary hover:underline underline-offset-4"
      >
        Open full compliance dashboard →
      </a>
    </div>
  );
}

function SourceDialog({
  source,
  onClose,
}: {
  source: Source | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="font-mono text-primary">[{source?.n}]</span>
            {source?.fileName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>
              Section / Page:{" "}
              <strong className="text-foreground">{source?.page}</strong>
            </span>
            <span>
              Similarity:{" "}
              <strong className="text-foreground">
                {((source?.score ?? 0) * 100).toFixed(1)}%
              </strong>
            </span>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-foreground border border-border">
            {source?.snippet}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
