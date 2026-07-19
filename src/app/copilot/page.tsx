"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  FileCheck2,
  History,
  Loader2,
  Quote,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { detectQueryIntent } from "@/lib/rag/intent";
import type { RCAReport } from "@/lib/agents/rca-types";
import type { OperationalPlaybook } from "@/lib/agents/playbook-types";
import type { EvidenceCitation } from "@/lib/agents/compliance-types";
import type { KnowledgeFeedback } from "@/app/api/feedback/route";
import {
  HeroBand,
  HeroMetricCard,
  ContentCard,
  FilterPills,
} from "@/components/page-shell";

type CopilotMode = "general" | "maintenance" | "expert" | "rca" | "compliance";

const MODES: { id: CopilotMode; label: string }[] = [
  { id: "general", label: "Ask Anything" },
  { id: "maintenance", label: "Past Incidents" },
  { id: "expert", label: "Expert Advice" },
  { id: "rca", label: "Machine Intelligence" },
  { id: "compliance", label: "Compliance Review" },
];

const KNOWLEDGE_SOURCES = [
  "SOP",
  "Incident Reports",
  "Work Orders",
  "Maintenance Logs",
  "Vendor Manuals",
  "Expert Interviews",
];

const EXAMPLE_QUERIES = [
  "Pump vibration increasing",
  "Why is Compressor C-204 overheating?",
  "What would Sharma recommend?",
];

type Stats = {
  documents: number;
  incidentsIndexed: number;
  expertsTracked: number;
  playbooksGenerated: number;
};

function EvidenceChip({ ev, onClick }: { ev: EvidenceCitation; onClick: () => void }) {
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

function PlaybookResult({ playbook }: { playbook: OperationalPlaybook }) {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceCitation | null>(null);

  return (
    <div className="space-y-4">
      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Asset</p>
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
                {inc.date && <span className="text-muted-foreground ml-1">({inc.date})</span>}
                <p className="text-xs mt-0.5">{inc.summary}</p>
              </li>
            ))}
          </ul>
        </ContentCard>

        <ContentCard>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Most Likely Cause
              </p>
              <p className="text-sm font-semibold">{playbook.mostCommonRootCause}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Previous Successful Resolution
              </p>
              <p className="text-sm font-semibold">{playbook.previousSuccessfulResolution}</p>
            </div>
          </div>
        </ContentCard>
      </div>

      {playbook.lessonsLearned.length > 0 && (
        <ContentCard className="border-amber-200/60 bg-amber-50/50">
          <p className="font-heading font-semibold mb-3">Lessons Learned</p>
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

      {playbook.supportingEvidence.length > 0 && (
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
    </div>
  );
}

function ResolutionFeedback({
  query,
  asset,
  onSaved,
}: {
  query: string;
  asset: string;
  onSaved: () => void;
}) {
  const [answered, setAnswered] = useState<"yes" | "no" | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [engineerName, setEngineerName] = useState("");
  const [additionalSteps, setAdditionalSteps] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (answered === "no") {
    return (
      <ContentCard className="text-sm text-muted-foreground">
        Thanks — flagged for review.
      </ContentCard>
    );
  }

  if (answered === "yes" && !showForm) {
    return (
      <ContentCard className="text-sm text-muted-foreground">
        Saved to organizational memory. Thank you.
      </ContentCard>
    );
  }

  return (
    <ContentCard>
      {!answered ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">Did this recommendation solve your issue?</p>
          <Button size="sm" onClick={() => { setAnswered("yes"); setShowForm(true); }}>
            Yes
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAnswered("no")}>
            No
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium">Did you perform any additional steps?</p>
          <Textarea
            value={additionalSteps}
            onChange={(e) => setAdditionalSteps(e.target.value)}
            placeholder="Optional — describe any extra steps taken"
            className="min-h-[60px]"
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              placeholder="Engineer name"
            />
            <Input value={asset} readOnly disabled />
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes"
            className="min-h-[60px]"
          />
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              disabled={!engineerName.trim() || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch("/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query, asset, engineerName, additionalSteps, notes }),
                  });
                  if (!res.ok) throw new Error();
                  setShowForm(false);
                  onSaved();
                } catch {
                  toast.error("Couldn't save — try again");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Status: Pending Manager Approval
            </span>
          </div>
        </div>
      )}
    </ContentCard>
  );
}

function RecentKnowledge({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<KnowledgeFeedback[] | null>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]));
  }, [refreshKey]);

  if (!entries || entries.length === 0) {
    return (
      <ContentCard className="text-sm text-muted-foreground">
        No engineer confirmations yet — be the first to confirm a resolution.
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Recent Knowledge Added">
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="text-sm border-b border-border/60 pb-2 last:border-0 last:pb-0">
            <p>
              <strong>{e.asset}</strong> — {e.query}
            </p>
            <p className="text-xs text-muted-foreground">
              {e.engineerName} · {new Date(e.createdAt).toLocaleDateString()} ·{" "}
              <Badge variant="outline" className="text-[10px] align-middle">
                {e.status}
              </Badge>
            </p>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

function CopilotInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<CopilotMode>("general");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [playbook, setPlaybook] = useState<OperationalPlaybook | null>(null);
  const [rcaReport, setRcaReport] = useState<RCAReport | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbackRefresh, setFeedbackRefresh] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const handleSubmit = useCallback(
    async (query: string, forceMode?: CopilotMode) => {
      if (!query.trim() || loading) return;
      const activeMode = forceMode ?? mode;
      setLoading(true);
      setPlaybook(null);
      setRcaReport(null);

      const intent = detectQueryIntent(query);

      try {
        if (activeMode === "compliance") {
          router.push("/compliance");
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

        // Ask Anything / Past Incidents / Expert Advice all resolve to the
        // same structured Operational Playbook — this page never renders
        // free-form chatbot prose.
        const res = await fetch("/api/playbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPlaybook(data.playbook);
      } catch {
        toast.error("Search failed", { description: "Try again in a moment." });
      } finally {
        setLoading(false);
      }
    },
    [loading, mode, router]
  );

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialized.current) {
      initialized.current = true;
      setInput(q);
      handleSubmit(q, detectQueryIntent(q) === "rca" ? "rca" : "general");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full min-w-0">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 shrink-0">
        <header>
          <h1 className="font-heading text-xl sm:text-2xl font-bold">
            Industrial Memory Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search decades of operational knowledge, historical incidents and expert experience.
          </p>
        </header>

        <HeroBand cols={4}>
          <HeroMetricCard label="Knowledge Sources" value={stats?.documents ?? "—"} icon={BookOpen} />
          <HeroMetricCard label="Historical Incidents" value={stats?.incidentsIndexed ?? "—"} icon={History} />
          <HeroMetricCard label="Expert Experiences" value={stats?.expertsTracked ?? "—"} icon={Users} />
          <HeroMetricCard label="Operational Playbooks" value={stats?.playbooksGenerated ?? "—"} icon={FileCheck2} />
        </HeroBand>

        <FilterPills
          options={MODES.map((m) => ({ id: m.id, label: m.label }))}
          value={mode}
          onChange={(id) => setMode(id as CopilotMode)}
        />

        <div className="flex flex-wrap gap-1.5">
          {KNOWLEDGE_SOURCES.map((s) => (
            <Badge key={s} variant="outline" className="text-[10px] text-muted-foreground">
              ✓ {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4 min-w-0">
        {!playbook && !rcaReport && !loading && (
          <div className="space-y-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setInput(q);
                  handleSubmit(q);
                }}
                className="w-full text-left card-rich rounded-xl border border-border/60 p-3 text-sm hover:border-primary/40"
              >
                {q}
              </button>
            ))}
          </div>
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
              <h2 className="font-semibold">Machine Intelligence — {rcaReport.asset}</h2>
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
                  <Link key={t} href={`/assets/${t}`} className="text-xs text-primary underline">
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

        {playbook && (
          <>
            <PlaybookResult playbook={playbook} />
            <ResolutionFeedback
              query={playbook.query}
              asset={playbook.asset}
              onSaved={() => setFeedbackRefresh((n) => n + 1)}
            />
          </>
        )}

        <RecentKnowledge refreshKey={feedbackRefresh} />
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
            placeholder="Describe your machine problem…"
            className="min-h-[44px] resize-none flex-1 min-w-0"
            rows={1}
            disabled={loading}
          />
          <Button type="submit" disabled={!input.trim() || loading} className="shrink-0 sm:self-end">
            {loading ? "…" : "Search"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CopilotInner />
    </Suspense>
  );
}
