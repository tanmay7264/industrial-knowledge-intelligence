"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  FileCheck2,
  Loader2,
  Quote,
  Shield,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OperationalPlaybook } from "@/lib/agents/playbook-types";
import type { EvidenceCitation } from "@/lib/agents/compliance-types";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

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
      className="text-left rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs hover:bg-muted/60 transition-colors"
    >
      <span className="font-mono text-primary">[{ev.n}]</span>{" "}
      <span className="font-medium">{ev.fileName}</span>
      <span className="text-muted-foreground ml-1">p.{ev.page}</span>
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
    <PageShell
      title="Operational Playbook"
      subtitle="Structured intelligence from organizational memory — not chat, not PDF search."
      maxWidth="md"
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Similar Incidents"
            value={playbook?.similarIncidents.length ?? "—"}
            icon={Target}
            trend={playbook ? 8 : undefined}
            sparklineData={sparklineFromSeed(
              playbook?.similarIncidents.length ?? 5
            )}
          />
          <HeroMetricCard
            label="Confidence Score"
            value={playbook ? `${playbook.confidenceScore}%` : "—"}
            icon={Shield}
            trend={playbook ? 5 : undefined}
            sparklineData={sparklineFromSeed(playbook?.confidenceScore ?? 87)}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="Evidence Sources"
            value={playbook?.supportingEvidence.length ?? "—"}
            icon={FileCheck2}
            trendLabel="Cited documents"
            sparklineData={sparklineFromSeed(
              playbook?.supportingEvidence.length ?? 6
            )}
          />
        </HeroBand>
      }
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const q = String(fd.get("query") ?? "").trim();
          if (q) void runPlaybook(q);
        }}
      >
        <Input
          name="query"
          defaultValue={query}
          placeholder='e.g. "Pump P-101 vibration increasing"'
          className="flex-1 h-10"
        />
        <Button type="submit" disabled={loading} className="glow-primary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
        </Button>
      </form>

      {loading && (
        <ContentCard className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          Synthesizing playbook from incidents, expert knowledge, and SOPs…
        </ContentCard>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {playbook && !loading && (
        <div className="space-y-4">
          <ContentCard>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Asset
                </p>
                <p className="font-heading text-2xl font-bold">{playbook.asset}</p>
                <p className="text-muted-foreground mt-2">{playbook.issue}</p>
              </div>
              <Badge className="bg-emerald-500 text-white text-base px-4 py-1.5">
                {playbook.confidenceScore}% confidence
              </Badge>
            </div>
          </ContentCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ContentCard title="Similar Incidents">
              <p className="font-heading text-3xl font-bold mb-3">
                {playbook.similarIncidents.length}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {playbook.similarIncidents.slice(0, 3).map((inc) => (
                  <li key={inc.id} className="border-l-2 border-primary/30 pl-3">
                    <span className="font-medium text-foreground">{inc.id}</span>
                    {inc.date && (
                      <span className="text-muted-foreground ml-1">({inc.date})</span>
                    )}
                    <p className="text-xs mt-0.5">{inc.summary}</p>
                  </li>
                ))}
              </ul>
            </ContentCard>

            <ContentCard>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                    Most Common Root Cause
                  </p>
                  <p className="text-sm font-semibold">
                    {playbook.mostCommonRootCause}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                    Previous Successful Resolution
                  </p>
                  <p className="text-sm font-semibold">
                    {playbook.previousSuccessfulResolution}
                  </p>
                </div>
              </div>
            </ContentCard>
          </div>

          {playbook.lessonsLearned.length > 0 && (
            <ContentCard className="border-amber-200/60 bg-amber-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="font-heading font-semibold">Lessons Learned</p>
              </div>
              <ul className="space-y-2 text-sm">
                {playbook.lessonsLearned.map((lesson) => (
                  <li key={lesson} className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    {lesson}
                  </li>
                ))}
              </ul>
            </ContentCard>
          )}

          <ContentCard className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Quote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-widest text-primary mb-1">
                  Expert Recommendation
                </p>
                <p className="text-sm italic leading-relaxed">
                  &ldquo;{playbook.expertRecommendation}&rdquo;
                </p>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Supporting Evidence">
            <div className="flex flex-wrap gap-2">
              {playbook.supportingEvidence.map((ev) => (
                <EvidenceChip
                  key={`${ev.n}-${ev.fileName}`}
                  ev={ev}
                  onClick={() => setSelectedEvidence(ev)}
                />
              ))}
            </div>
          </ContentCard>

          <Link
            href={`/graph?term=${encodeURIComponent(playbook.asset)}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View in Knowledge Graph <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {!playbook && !loading && !error && (
        <ContentCard className="border-dashed py-12 text-center text-muted-foreground text-sm">
          Enter an operational symptom to generate a playbook from organizational memory.
        </ContentCard>
      )}

      <Dialog open={!!selectedEvidence} onOpenChange={() => setSelectedEvidence(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              [{selectedEvidence?.n}] {selectedEvidence?.fileName}
            </DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Section {selectedEvidence.page} · similarity{" "}
                {(selectedEvidence.score * 100).toFixed(0)}%
              </p>
              <p className="leading-relaxed">{selectedEvidence.snippet}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default function PlaybookPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Loading…</div>}>
      <PlaybookContent />
    </Suspense>
  );
}
