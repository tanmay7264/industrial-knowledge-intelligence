"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { detectQueryIntent } from "@/lib/rag/intent";
import type { RCAReport } from "@/lib/agents/rca-types";

type CopilotMode = "general" | "maintenance" | "rca" | "safety" | "compliance";

const MODES: { id: CopilotMode; label: string }[] = [
  { id: "general", label: "General Search" },
  { id: "maintenance", label: "Maintenance Analysis" },
  { id: "rca", label: "Root Cause Analysis" },
  { id: "safety", label: "Safety Investigation" },
  { id: "compliance", label: "Compliance Review" },
];

const HERO_QUERY = "Why does Pump P-301 keep failing?";

function CopilotInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<CopilotMode>("general");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const [rcaReport, setRcaReport] = useState<RCAReport | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialized.current) {
      initialized.current = true;
      setInput(q);
      handleSubmit(q, detectQueryIntent(q) === "rca" ? "rca" : "general");
    }
  }, [searchParams]);

  const handleSubmit = useCallback(
    async (query: string, forceMode?: CopilotMode) => {
      if (!query.trim() || loading) return;
      const activeMode = forceMode ?? mode;
      setLoading(true);
      setAnswer("");
      setRcaReport(null);

      const intent = detectQueryIntent(query);

      try {
        if (activeMode === "maintenance" || intent === "playbook") {
          router.push(`/playbook?q=${encodeURIComponent(query.trim())}`);
          return;
        }
        if (activeMode === "rca" || intent === "rca") {
          const res = await fetch("/api/rca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query.trim() }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setRcaReport(data);
          return;
        }
        if (activeMode === "compliance") {
          router.push("/compliance");
          return;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            docTypeFilter: activeMode === "safety" ? "incident_report" : undefined,
          }),
        });
        const ct = res.headers.get("Content-Type") ?? "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          setAnswer(data.answer ?? "");
        } else if (res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let text = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";
            for (const block of events) {
              const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
              const eventLine = block.split("\n").find((l) => l.startsWith("event: "));
              if (!dataLine || !eventLine) continue;
              const payload = JSON.parse(dataLine.slice(6));
              if (eventLine.slice(7).trim() === "text") {
                text += payload.chunk as string;
                setAnswer(text);
              } else if (eventLine.slice(7).trim() === "done") {
                setAnswer(payload.answer as string ?? text);
              }
            }
          }
        }
      } catch {
        toast.error("Copilot request failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, mode, router]
  );

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold">AI Copilot</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Central intelligence interface — search, analyze, investigate
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                mode === m.id
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {!answer && !rcaReport && !loading && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setInput(HERO_QUERY);
                setMode("rca");
                handleSubmit(HERO_QUERY, "rca");
              }}
              className="w-full text-left px-4 py-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-sm"
            >
              <span className="text-primary font-medium">Hero demo:</span> {HERO_QUERY}
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {rcaReport && (
          <div className="space-y-4 border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">RCA — {rcaReport.asset}</h2>
              <Badge>{rcaReport.confidence}% confidence</Badge>
            </div>
            <p className="text-sm"><strong>Primary hypothesis:</strong> {rcaReport.primaryHypothesis}</p>
            {rcaReport.alternativeHypotheses.length > 0 && (
              <div className="text-sm">
                <strong>Alternatives:</strong>
                <ul className="list-disc ml-4 mt-1">
                  {rcaReport.alternativeHypotheses.map((h, i) => (
                    <li key={i}>{h.cause} ({h.confidence}%)</li>
                  ))}
                </ul>
              </div>
            )}
            {rcaReport.correctiveActions.length > 0 && (
              <div className="text-sm">
                <strong>Recommended actions:</strong>
                <ul className="list-disc ml-4 mt-1">
                  {rcaReport.correctiveActions.map((a, i) => (
                    <li key={i}>{a.action} — {a.urgency}</li>
                  ))}
                </ul>
              </div>
            )}
            {rcaReport.relatedAssets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {rcaReport.relatedAssets.map((t) => (
                  <Link key={t} href={`/assets/${t}`} className="text-xs text-primary underline">{t}</Link>
                ))}
              </div>
            )}
            <Link href="/rca" className="text-sm text-primary">Open full RCA workspace →</Link>
          </div>
        )}

        {answer && (
          <div className="prose prose-sm dark:prose-invert max-w-none border rounded-xl p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
          }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Industrial Brain anything…"
            className="min-h-[44px] resize-none flex-1"
            rows={1}
            disabled={loading}
          />
          <Button type="submit" disabled={!input.trim() || loading}>
            {loading ? "…" : "Ask"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading copilot…</div>}>
      <CopilotInner />
    </Suspense>
  );
}
