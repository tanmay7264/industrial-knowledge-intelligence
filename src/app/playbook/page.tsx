"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  GitBranch,
  Loader2,
  Quote,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OperationalPlaybook } from "@/lib/agents/playbook-types";
import type { EvidenceCitation } from "@/lib/agents/compliance-types";

function EvidenceChip({
  ev,
  onClick,
}: {
  ev: EvidenceCitation;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
    >
      <span className="font-mono text-primary">[{ev.n}]</span>{" "}
      <span className="font-medium">{ev.fileName}</span>
      <span className="text-slate-400 ml-1">p.{ev.page}</span>
    </button>
  );
}

function PlaybookContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [playbook, setPlaybook] = useState<OperationalPlaybook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceCitation | null>(null);

  useEffect(() => {
    if (initialQuery) {
      void runPlaybook(initialQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  async function runPlaybook(q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPlaybook(data.playbook);
      setQuery(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate playbook");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #b8f0dc 0%, #d8d4f4 45%, #ead4f8 100%)" }}
    >
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-800">
            Operational Playbook
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Structured intelligence from organizational memory — not chat, not PDF search.
          </p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("query") ?? "").trim();
            if (q) void runPlaybook(q);
          }}
        >
          <input
            name="query"
            defaultValue={query}
            placeholder='e.g. "Pump P-101 vibration increasing"'
            className="flex-1 rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm shadow-sm"
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </Button>
        </form>

        {loading && (
          <div className="rounded-2xl border border-white/60 bg-white/70 p-12 text-center text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            Synthesizing playbook from incidents, expert knowledge, and SOPs…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {playbook && !loading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm shadow-sm p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Asset</p>
                  <p className="font-heading text-2xl font-bold text-slate-800">{playbook.asset}</p>
                  <p className="text-slate-600 mt-2">{playbook.issue}</p>
                </div>
                <Badge className="bg-emerald-500 text-white text-base px-4 py-1.5">
                  {playbook.confidenceScore}% confidence
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                  Similar Incidents
                </p>
                <p className="font-heading text-3xl font-bold text-slate-800">
                  {playbook.similarIncidents.length}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {playbook.similarIncidents.slice(0, 3).map((inc) => (
                    <li key={inc.id} className="border-l-2 border-primary/30 pl-3">
                      <span className="font-medium">{inc.id}</span>
                      {inc.date && <span className="text-slate-400 ml-1">({inc.date})</span>}
                      <p className="text-xs mt-0.5">{inc.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/70 p-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                    Most Common Root Cause
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {playbook.mostCommonRootCause}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                    Previous Successful Resolution
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {playbook.previousSuccessfulResolution}
                  </p>
                </div>
              </div>
            </div>

            {playbook.lessonsLearned.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <p className="font-heading font-semibold text-slate-800">Lessons Learned</p>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {playbook.lessonsLearned.map((lesson) => (
                    <li key={lesson} className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      {lesson}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-5">
              <div className="flex items-start gap-3">
                <Quote className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-violet-600 mb-1">
                    Expert Recommendation
                  </p>
                  <p className="text-sm text-slate-800 italic leading-relaxed">
                    &ldquo;{playbook.expertRecommendation}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/70 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-slate-500" />
                <p className="font-heading font-semibold text-slate-800">Supporting Evidence</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {playbook.supportingEvidence.map((ev) => (
                  <EvidenceChip
                    key={`${ev.n}-${ev.fileName}`}
                    ev={ev}
                    onClick={() => setSelectedEvidence(ev)}
                  />
                ))}
              </div>
            </div>

            <Link
              href={`/graph?term=${encodeURIComponent(playbook.asset)}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View in Knowledge Graph <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {!playbook && !loading && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center text-slate-500 text-sm">
            Enter an operational symptom to generate a playbook from organizational memory.
          </div>
        )}
      </div>

      <Dialog open={!!selectedEvidence} onOpenChange={() => setSelectedEvidence(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              [{selectedEvidence?.n}] {selectedEvidence?.fileName}
            </DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-2 text-sm">
              <p className="text-slate-500">
                Section {selectedEvidence.page} · similarity{" "}
                {(selectedEvidence.score * 100).toFixed(0)}%
              </p>
              <p className="text-slate-700 leading-relaxed">{selectedEvidence.snippet}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PlaybookPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading…</div>}>
      <PlaybookContent />
    </Suspense>
  );
}
