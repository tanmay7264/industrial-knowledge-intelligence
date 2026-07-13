"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, FileSearch, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { detectQueryIntent } from "@/lib/rag/intent";
import type { RCAReport } from "@/lib/agents/rca-types";
import {
  HeroBand,
  HeroMetricCard,
  ContentCard,
  FilterPills,
} from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

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
  const [queryCount] = useState(24);
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
            docTypeFilter:
              activeMode === "safety" ? "incident_report" : undefined,
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
              const dataLine = block
                .split("\n")
                .find((l) => l.startsWith("data: "));
              const eventLine = block
                .split("\n")
                .find((l) => l.startsWith("event: "));
              if (!dataLine || !eventLine) continue;
              const payload = JSON.parse(dataLine.slice(6));
              if (eventLine.slice(7).trim() === "text") {
                text += payload.chunk as string;
                setAnswer(text);
              } else if (eventLine.slice(7).trim() === "done") {
                setAnswer((payload.answer as string) ?? text);
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
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full min-w-0">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 shrink-0">
        <header>
          <h1 className="font-heading text-xl sm:text-2xl font-bold">AI Copilot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Central intelligence interface — search, analyze, investigate
          </p>
        </header>

        <HeroBand>
          <HeroMetricCard
            label="Queries Today"
            value={queryCount}
            icon={MessageSquare}
            trend={22}
            sparklineData={sparklineFromSeed(queryCount)}
          />
          <HeroMetricCard
            label="Avg Response"
            value="1.2s"
            icon={Clock}
            trend={-15}
            trendLabel="Faster than last week"
            sparklineData={sparklineFromSeed(120)}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="Evidence Citations"
            value="4.8"
            icon={FileSearch}
            trend={8}
            trendLabel="Avg per answer"
            sparklineData={sparklineFromSeed(48)}
          />
        </HeroBand>

        <FilterPills
          options={MODES.map((m) => ({ id: m.id, label: m.label }))}
          value={mode}
          onChange={(id) => setMode(id as CopilotMode)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4 min-w-0">
        {!answer && !rcaReport && !loading && (
          <button
            type="button"
            onClick={() => {
              setInput(HERO_QUERY);
              setMode("rca");
              handleSubmit(HERO_QUERY, "rca");
            }}
            className="w-full text-left card-rich rounded-xl border border-primary/30 p-4 text-sm hover:border-primary/50"
          >
            <span className="text-primary font-medium">Hero demo:</span>{" "}
            {HERO_QUERY}
          </button>
        )}

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {rcaReport && (
          <ContentCard>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">RCA — {rcaReport.asset}</h2>
              <Badge>{rcaReport.confidence}% confidence</Badge>
            </div>
            <p className="text-sm">
              <strong>Primary hypothesis:</strong> {rcaReport.primaryHypothesis}
            </p>
            {rcaReport.alternativeHypotheses.length > 0 && (
              <div className="text-sm mt-3">
                <strong>Alternatives:</strong>
                <ul className="list-disc ml-4 mt-1">
                  {rcaReport.alternativeHypotheses.map((h, i) => (
                    <li key={i}>
                      {h.cause} ({h.confidence}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rcaReport.correctiveActions.length > 0 && (
              <div className="text-sm mt-3">
                <strong>Recommended actions:</strong>
                <ul className="list-disc ml-4 mt-1">
                  {rcaReport.correctiveActions.map((a, i) => (
                    <li key={i}>
                      {a.action} — {a.urgency}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rcaReport.relatedAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {rcaReport.relatedAssets.map((t) => (
                  <Link
                    key={t}
                    href={`/assets/${t}`}
                    className="text-xs text-primary underline"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/rca" className="text-sm text-primary mt-3 inline-block">
              Open full RCA workspace →
            </Link>
          </ContentCard>
        )}

        {answer && (
          <ContentCard>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            </div>
          </ContentCard>
        )}
      </div>

      <div className="border-t glass p-3 sm:p-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
          }}
          className="flex flex-col sm:flex-row gap-2 max-w-4xl mx-auto w-full"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Industrial Brain anything…"
            className="min-h-[44px] resize-none flex-1 min-w-0"
            rows={1}
            disabled={loading}
          />
          <Button type="submit" disabled={!input.trim() || loading} className="shrink-0 sm:self-end">
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
