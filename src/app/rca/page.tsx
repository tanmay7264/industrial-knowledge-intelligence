"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FolderOpen,
  GitBranch,
  History,
  Save,
  ShieldCheck,
  UserCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const STAGES = [
  "Searching historical incidents",
  "Retrieving expert knowledge",
  "Reviewing maintenance records",
  "Checking SOP and vendor guidance",
  "Correlating operational evidence",
  "Ranking likely root causes",
  "Preparing recommended resolution",
];

const EXAMPLES = [
  "Pump P301 vibration increasing",
  "Compressor C204 overheating",
  "Boiler B301 pressure loss",
  "Repeated bearing failure",
  "Hydraulic leakage",
];

const SCOPE_METRICS = [
  { label: "Historical Incidents", value: 12, icon: History },
  { label: "Expert Experiences", value: 5, icon: UserCheck },
  { label: "Maintenance Records", value: 31, icon: Wrench },
  { label: "Operational Playbooks", value: 8, icon: BookOpen },
];

const INVESTIGATION_FLOW = [
  "Problem",
  "Historical Knowledge",
  "Evidence",
  "Root Cause",
  "Recommendation",
  "Knowledge Capture",
  "Memory Updated",
];

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

function DetailList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No recommendation recorded.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function RCAInner() {
  const searchParams = useSearchParams();
  const defaultAsset = searchParams.get("asset") ?? "";
  const defaultQuery = searchParams.get("query") ?? "";
  const [query, setQuery] = useState(
    defaultQuery || (defaultAsset ? `${defaultAsset} vibration increasing` : "")
  );
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(-1);
  const [report, setReport] = useState<RCAReport | null>(null);
  const [solved, setSolved] = useState<"yes" | "no" | null>(null);
  const [savedMemory, setSavedMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [engineerName, setEngineerName] = useState("");
  const [additionalSteps, setAdditionalSteps] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceCitation | null>(null);

  const runInvestigation = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setReport(null);
    setSolved(null);
    setSavedMemory(false);
    setEngineerName("");
    setAdditionalSteps("");
    setStage(0);

    const interval = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 800);

    try {
      const res = await fetch("/api/rca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          asset: defaultAsset || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      clearInterval(interval);
      setStage(STAGES.length);
      setLoading(false);
    }
  }, [query, loading, defaultAsset]);

  return (
    <PageShell
      title="AI Root Cause Investigation"
      subtitle="Investigate machine failures using historical incidents, maintenance history, expert knowledge and operational evidence."
      maxWidth="xl"
      hero={
        <HeroBand cols={4}>
          {SCOPE_METRICS.map((metric) => (
            <HeroMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
            />
          ))}
        </HeroBand>
      }
    >
      <ContentCard>
        <div className="flex flex-wrap items-center gap-2">
          {INVESTIGATION_FLOW.map((step, index) => (
            <div key={step} className="flex items-center gap-2 text-xs">
              <span
                className={`rounded-full px-2.5 py-1 ${
                  index <= (report ? 6 : loading ? Math.min(stage, 5) : 0)
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step}
              </span>
              {index < INVESTIGATION_FLOW.length - 1 && (
                <span className="text-muted-foreground">→</span>
              )}
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Investigation Summary">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="min-w-0 flex-1">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe the machine problem..."
              className="min-h-[86px]"
              disabled={loading}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  disabled={loading}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={runInvestigation}
            disabled={loading || !query.trim()}
            className="h-10 lg:self-start"
          >
            <BrainCircuit />
            {loading ? "Investigating..." : "Run Investigation"}
          </Button>
        </div>
      </ContentCard>

      {loading && (
        <ContentCard title="AI Investigation In Progress">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((label, i) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                  i <= stage
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-border/60 text-muted-foreground"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    i < stage
                      ? "bg-emerald-500"
                      : i === stage
                        ? "bg-primary animate-pulse"
                        : "bg-muted-foreground/30"
                  }`}
                />
                {label}
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {report && (
        <div className="space-y-4 sm:space-y-6">
          <ContentCard
            title="AI Investigation Summary"
            action={
              <Badge className="h-7 px-3 text-sm">
                {report.confidence}% confidence
              </Badge>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Most Likely Root Cause
                </p>
                <h2 className="mt-1 font-heading text-2xl font-bold">
                  {report.primaryHypothesis}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <p className="font-medium">{report.investigationSummary.riskLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Downtime</p>
                    <p className="font-medium">
                      {report.investigationSummary.estimatedDowntime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Repair Time</p>
                    <p className="font-medium">
                      {report.investigationSummary.estimatedRepairTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Machine</p>
                    <p className="font-medium">{report.problemSummary.machine}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-sm font-semibold">Confidence Based On</p>
                <div className="mt-3 space-y-2">
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
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {report.knowledgeSources.map((source) => (
                <Badge key={source} variant="outline">
                  {source}
                </Badge>
              ))}
            </div>
          </ContentCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ContentCard title="Problem Summary">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Machine</p>
                  <p className="font-medium">{report.problemSummary.machine}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Severity</p>
                  <p className="font-medium">{report.problemSummary.severity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reported By</p>
                  <p className="font-medium">{report.problemSummary.reportedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{report.problemSummary.date}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {report.problemSummary.symptoms.map((symptom) => (
                    <Badge key={symptom} variant="secondary">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>
            </ContentCard>

            <ContentCard title="Historical Similar Incidents">
              {report.similarIncidents.length > 0 ? (
                <ResponsiveTableWrap>
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="pb-2 font-medium">Incident Number</th>
                        <th className="pb-2 font-medium">Similarity</th>
                        <th className="pb-2 font-medium">Resolved By</th>
                        <th className="pb-2 font-medium">Resolution Success</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {report.similarIncidents.map((incident) => (
                        <tr key={incident.incidentNumber}>
                          <td className="py-3 font-medium">{incident.incidentNumber}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-10 tabular-nums">
                                {incident.similarity}%
                              </span>
                              <PercentBar value={incident.similarity} />
                            </div>
                          </td>
                          <td className="py-3">{incident.resolvedBy}</td>
                          <td className="py-3">
                            <Badge variant="outline">{incident.resolutionSuccess}</Badge>
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
          </div>

          <ContentCard title="Possible Root Causes">
            <div className="grid gap-3 md:grid-cols-2">
              {[{ cause: report.primaryHypothesis, confidence: report.confidence }, ...report.alternativeHypotheses]
                .sort((a, b) => b.confidence - a.confidence)
                .map((hypothesis) => (
                  <div key={hypothesis.cause} className="rounded-lg border border-border/60 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium">{hypothesis.cause}</p>
                      <Badge variant="outline">{hypothesis.confidence}%</Badge>
                    </div>
                    <PercentBar value={hypothesis.confidence} />
                  </div>
                ))}
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
                  <p className="line-clamp-3 text-xs text-muted-foreground">
                    {ev.snippet}
                  </p>
                </button>
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Recommended Action Plan">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Inspection Order</h3>
                <DetailList items={report.actionPlan.inspectionOrder} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Repair Procedure</h3>
                <DetailList items={report.actionPlan.repairProcedure} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Safety Precautions</h3>
                <DetailList items={report.actionPlan.safetyPrecautions} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Required Spare Parts</h3>
                <DetailList items={report.actionPlan.requiredSpareParts} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Required Tools</h3>
                <DetailList items={report.actionPlan.requiredTools} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Verification Checklist</h3>
                <DetailList items={report.actionPlan.verificationChecklist} />
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Quick Actions">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" render={<Link href={`/graph?asset=${report.asset}`} />}>
                <GitBranch />
                View AI Reasoning Graph
              </Button>
              <Button render={<Link href={`/playbook?q=${encodeURIComponent(report.query)}`} />}>
                <ClipboardCheck />
                Generate AI Operational Playbook
              </Button>
              <Button variant="outline" render={<Link href="/incidents" />}>
                <History />
                Open Historical Incident
              </Button>
              <Button variant="outline" render={<Link href="/documents" />}>
                <FileSearch />
                View Supporting Documents
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("organizational-memory")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <Save />
                Save Investigation
              </Button>
            </div>
          </ContentCard>

          <div id="organizational-memory">
          <ContentCard title="Organizational Memory">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium">
                  Did this recommended resolution solve the issue?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Approved feedback becomes new Organizational Memory for future
                  investigations.
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
                <Input value={report.asset} readOnly aria-label="Machine" />
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
                    onClick={async () => {
                      setSavingMemory(true);
                      try {
                        const res = await fetch("/api/feedback", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            query: report.query,
                            asset: report.asset,
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
                    }}
                  >
                    <ShieldCheck />
                    {savingMemory ? "Saving..." : "Save Organizational Memory"}
                    <ArrowRight />
                  </Button>
                  {savedMemory && (
                    <p className="mt-2 text-sm text-emerald-600">
                      Saved for manager approval.
                    </p>
                  )}
                </div>
              </div>
            )}
          </ContentCard>
          </div>
        </div>
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

export default function RCAPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <RCAInner />
    </Suspense>
  );
}
