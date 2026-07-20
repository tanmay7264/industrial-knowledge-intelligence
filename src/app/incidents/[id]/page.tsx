"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  FolderOpen,
  GitBranch,
  History,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
  ResponsiveTableWrap,
} from "@/components/page-shell";
import type { RCAReport } from "@/lib/agents/rca-types";
import type { EvidenceCitation } from "@/lib/agents/compliance-types";

interface IncidentDetail {
  incident: {
    id: string;
    asset: string;
    machineName: string;
    department: string;
    date?: string;
    title: string;
    document: string | null;
  };
  report: RCAReport;
  lessons: { text: string; expertName?: string; sourceDoc?: string }[];
  expert: {
    name: string;
    experienceYears: number;
    incidentsSolved: number;
  } | null;
  failureDNA: {
    machine: string;
    failurePattern: string;
    occurrence: number;
    firstSeen: string;
    lastSeen: string;
    successRate: number;
    expertName: string;
    aiConfidence: number;
  };
  resolutionTimeline: { stage: string; detail: string }[];
}

function PercentBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function IncidentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params.id ?? "");
  const assetHint = searchParams.get("asset") ?? "";

  const [data, setData] = useState<IncidentDetail | null>(null);
  const [error, setError] = useState(false);
  const [solved, setSolved] = useState<"yes" | "no" | null>(null);
  const [savedMemory, setSavedMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [engineerName, setEngineerName] = useState("");
  const [additionalSteps, setAdditionalSteps] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceCitation | null>(
    null
  );

  useEffect(() => {
    if (!id) return;
    fetch(`/api/incidents/${encodeURIComponent(id)}?asset=${encodeURIComponent(assetHint)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, [id, assetHint]);

  const saveMemory = useCallback(async () => {
    if (!data || !engineerName.trim()) return;
    setSavingMemory(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: data.incident.title,
          asset: data.incident.asset,
          engineerName,
          additionalSteps,
        }),
      });
      if (!res.ok) throw new Error();
      setSavedMemory(true);
    } catch {
      toast.error("Couldn't save — try again");
    } finally {
      setSavingMemory(false);
    }
  }, [data, engineerName, additionalSteps]);

  if (error) {
    return (
      <PageShell title="Historical Failure" subtitle="Failure Intelligence">
        <ContentCard>
          <p className="text-sm text-muted-foreground">
            This historical failure could not be loaded.{" "}
            <Link href="/incidents" className="text-primary underline">
              Back to Failure Intelligence
            </Link>
          </p>
        </ContentCard>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell title="Historical Failure" subtitle="Investigating organizational memory…">
        <ContentCard>
          <p className="text-sm text-muted-foreground">Loading failure record…</p>
        </ContentCard>
      </PageShell>
    );
  }

  const { incident, report, lessons, expert, failureDNA, resolutionTimeline } = data;
  const rankedCauses = [
    { cause: report.primaryHypothesis, confidence: report.confidence },
    ...report.alternativeHypotheses,
  ].sort((a, b) => b.confidence - a.confidence);

  return (
    <PageShell
      title={incident.title}
      subtitle={`${incident.machineName} · ${incident.department} · ${incident.date ?? ""}`}
      maxWidth="xl"
      hero={
        <HeroBand cols={4}>
          <HeroMetricCard label="Occurrence" value={failureDNA.occurrence} icon={History} />
          <HeroMetricCard
            label="First → Last Seen"
            value={`${failureDNA.firstSeen} → ${failureDNA.lastSeen}`}
            icon={GitBranch}
          />
          <HeroMetricCard
            label="Success Rate of Fix"
            value={`${failureDNA.successRate}%`}
            icon={ShieldCheck}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="AI Confidence"
            value={`${failureDNA.aiConfidence}%`}
            icon={CheckCircle2}
          />
        </HeroBand>
      }
    >
      <ContentCard title="Failure DNA">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Machine</p>
            <p className="font-medium">{failureDNA.machine}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Failure Pattern</p>
            <p className="font-medium">{failureDNA.failurePattern}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expert Most Associated</p>
            <p className="font-medium">{failureDNA.expertName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">AI Confidence</p>
            <p className="font-medium">{failureDNA.aiConfidence}%</p>
          </div>
        </div>
      </ContentCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Incident Summary">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Machine</p>
              <p className="font-medium">{report.problemSummary.machine}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="font-medium">{incident.department}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{report.problemSummary.date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Severity</p>
              <p className="font-medium">{report.problemSummary.severity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Downtime</p>
              <p className="font-medium">{report.investigationSummary.estimatedDowntime}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reported By</p>
              <p className="font-medium">{report.problemSummary.reportedBy}</p>
            </div>
          </div>
        </ContentCard>

        <ContentCard title="Symptoms">
          <div className="flex flex-wrap gap-2">
            {report.problemSummary.symptoms.map((symptom) => (
              <Badge key={symptom} variant="secondary">
                {symptom}
              </Badge>
            ))}
          </div>
        </ContentCard>
      </div>

      <ContentCard title="AI Similarity Analysis">
        {report.similarIncidents.length > 0 ? (
          <ResponsiveTableWrap>
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Incident</th>
                  <th className="pb-2 font-medium">Similarity</th>
                  <th className="pb-2 font-medium">Resolved By</th>
                  <th className="pb-2 font-medium">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.similarIncidents.map((sim) => (
                  <tr key={sim.incidentNumber}>
                    <td className="py-3 font-medium">{sim.incidentNumber}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-10 tabular-nums">{sim.similarity}%</span>
                        <PercentBar value={sim.similarity} />
                      </div>
                    </td>
                    <td className="py-3">{sim.resolvedBy}</td>
                    <td className="py-3">
                      <Badge variant="outline">{sim.resolutionSuccess}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableWrap>
        ) : (
          <p className="text-sm text-muted-foreground">
            No close historical match was found in Organizational Memory.
          </p>
        )}
      </ContentCard>

      <ContentCard title="Root Cause">
        <div className="grid gap-3 md:grid-cols-2">
          {rankedCauses.map((cause) => (
            <div key={cause.cause} className="rounded-lg border border-border/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-medium">{cause.cause}</p>
                <Badge variant="outline">{cause.confidence}%</Badge>
              </div>
              <PercentBar value={cause.confidence} />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-border/60 p-4">
          <p className="text-sm font-semibold">Confidence Based On</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {report.confidenceSignals.map((signal) => (
              <div key={signal.label} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {signal.count !== undefined ? `${signal.count} ` : ""}
                  {signal.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Resolution Timeline">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
          {resolutionTimeline.map((step, i) => (
            <div key={step.stage} className="flex items-center gap-3 sm:flex-1">
              <div className="min-w-0 rounded-lg border border-border/60 p-3 text-sm sm:flex-1">
                <p className="font-medium">{step.stage}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
              </div>
              {i < resolutionTimeline.length - 1 && (
                <span className="hidden text-muted-foreground sm:inline">→</span>
              )}
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Expert Knowledge">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Solved By</p>
              <p className="font-medium">{expert?.name ?? "Unassigned"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Years of Experience</p>
              <p className="font-medium">{expert?.experienceYears ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Manager Approval</p>
              <p className="font-medium">
                {incident.document ? "Approved" : "Pending Manager Approval"}
              </p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Lessons Learned</p>
            {lessons.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {lessons.slice(0, 5).map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      {l.text}
                      {l.expertName && (
                        <span className="text-muted-foreground"> — {l.expertName}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No documented lessons learned yet for this asset.
              </p>
            )}
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Supporting Evidence">
        <div className="grid gap-3 md:grid-cols-2">
          {report.supportingEvidence.map((ev) => (
            <button
              key={`${ev.n}-${ev.fileName}`}
              type="button"
              onClick={() => setSelectedEvidence(ev)}
              className="text-left rounded-lg border border-border/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Evidence #{ev.n}
                  </p>
                  <p className="mt-1 text-sm font-medium">{ev.fileName}</p>
                </div>
                <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
              </div>
              <p className="line-clamp-3 text-xs text-muted-foreground">{ev.snippet}</p>
            </button>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Knowledge Connections">
        <div className="flex flex-wrap gap-2">
          {report.relatedAssets.map((a) => (
            <Link key={a} href={`/assets/${a}`} className="text-sm">
              <Badge variant="outline">{a}</Badge>
            </Link>
          ))}
          {report.knowledgeSources.map((source) => (
            <Badge key={source} variant="secondary">
              {source}
            </Badge>
          ))}
        </div>
        <Link
          href={`/graph?asset=${incident.asset}`}
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          View AI Reasoning Graph →
        </Link>
      </ContentCard>

      <ContentCard title="Quick Actions">
        <div className="flex flex-wrap gap-2">
          <Button
            render={
              <Link
                href={`/rca?asset=${incident.asset}&query=${encodeURIComponent(incident.title)}`}
              />
            }
          >
            <History />
            Start AI Investigation
          </Button>
          <Button variant="outline" render={<Link href={`/graph?asset=${incident.asset}`} />}>
            <GitBranch />
            View AI Reasoning Graph
          </Button>
          <Button
            variant="outline"
            render={<Link href={`/playbook?q=${encodeURIComponent(incident.title)}`} />}
          >
            Open Operational Playbook
          </Button>
          <Button variant="outline" render={<Link href="/documents" />}>
            <FileSearch />
            View Supporting Documents
          </Button>
          <Button variant="outline" render={<Link href="/incidents" />}>
            Compare Similar Incidents
          </Button>
        </div>
      </ContentCard>

      <ContentCard title="Knowledge Contribution">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium">Did this historical case help solve your problem?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Approved feedback becomes new Organizational Memory for future engineers.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={solved === "yes" ? "default" : "outline"}
              onClick={() => setSolved("yes")}
            >
              Yes
            </Button>
            <Button
              variant={solved === "no" ? "default" : "outline"}
              onClick={() => setSolved("no")}
            >
              No
            </Button>
          </div>
        </div>

        {solved === "yes" && (
          <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 md:grid-cols-2">
            <Input
              placeholder="Engineer Name"
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              disabled={savingMemory || savedMemory}
            />
            <Input value={incident.asset} readOnly aria-label="Machine" />
            <Input value={new Date().toISOString().slice(0, 10)} readOnly aria-label="Date" />
            <Input value="Pending Manager Approval" readOnly aria-label="Manager Approval Status" />
            <Textarea
              placeholder="Did you perform any additional corrective actions?"
              className="md:col-span-2"
              value={additionalSteps}
              onChange={(e) => setAdditionalSteps(e.target.value)}
              disabled={savingMemory || savedMemory}
            />
            <div className="md:col-span-2">
              <Button
                disabled={!engineerName.trim() || savingMemory || savedMemory}
                onClick={saveMemory}
              >
                <ShieldCheck />
                {savingMemory ? "Saving..." : "Save Organizational Memory"}
                <ArrowRight />
              </Button>
              {savedMemory && (
                <p className="mt-2 text-sm text-emerald-600">Saved for manager approval.</p>
              )}
            </div>
          </div>
        )}
      </ContentCard>

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
