"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import type { OperationalPlaybook } from "@/lib/agents/playbook-types";
import type { RCAReport } from "@/lib/agents/rca-types";
import type { KnowledgeRiskReport } from "@/lib/agents/knowledge-risk";

type DemoMode = "brain" | "iom";
type StepStatus = "idle" | "running" | "done" | "error";

const BRAIN_STEPS = [
  { id: "problem", title: "Problem detected — P-301 vibration alert", caption: "Cooling water pump P-301 showing pre-failure vibration pattern." },
  { id: "upload", title: "Documents ingested", caption: "Maintenance records, inspection reports, OEM manual, operator logs indexed." },
  { id: "ask", title: "Ask Copilot", caption: '"Why does Pump P-301 keep failing?"' },
  { id: "investigate", title: "Asset 360 investigation", caption: "Timeline shows two bearing replacements without alignment checks." },
  { id: "rca", title: "RCA workspace", caption: "Ranked hypothesis: cavitation + shaft misalignment at 87% confidence." },
  { id: "graph", title: "Knowledge graph", caption: "P-301 → cavitation → bearing failure → maintenance chain discovered." },
  { id: "alert", title: "Proactive alert", caption: "P-305 showing similar pattern — apply P-301 RCA proactively." },
];

const IOM_STEPS = [
  { id: "problem", title: "Knowledge disappears when experts retire", caption: "P-101 vibration alert — Sharma retired." },
  { id: "risk", title: "Knowledge Risk dashboard", caption: "Engineer Sharma: 92% risk, 432 incidents." },
  { id: "corpus", title: "Organizational memory ingested", caption: "SOPs, incidents, expert interviews indexed." },
  { id: "playbook", title: "Operational Playbook", caption: '"Pump P-101 vibration increasing" → structured playbook.' },
  { id: "evidence", title: "Every claim cited", caption: "Incident #24, Work Order #55, SOP Rev B, Sharma interview." },
  { id: "closing", title: "Memory remains", caption: "Experts retire — organizational memory remains." },
];

export default function DemoPage() {
  const [mode, setMode] = useState<DemoMode>("brain");
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [runningAll, setRunningAll] = useState(false);
  const [rca, setRca] = useState<RCAReport | null>(null);
  const [playbook, setPlaybook] = useState<OperationalPlaybook | null>(null);
  const [riskReport, setRiskReport] = useState<KnowledgeRiskReport | null>(null);

  const steps = mode === "brain" ? BRAIN_STEPS : IOM_STEPS;

  const setStatus = (id: string, status: StepStatus) =>
    setStatuses((s) => ({ ...s, [id]: status }));

  const runStep = useCallback(async (id: string, demoMode: DemoMode) => {
    setStatus(id, "running");
    try {
      if (demoMode === "brain") {
        if (id === "rca" || id === "ask") {
          const res = await fetch("/api/rca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: "Why does Pump P-301 keep failing?", asset: "P-301" }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setRca(data);
        }
        if (id === "alert") {
          const res = await fetch("/api/alerts");
          await res.json();
        }
      } else {
        if (id === "risk") {
          const res = await fetch("/api/knowledge-risk");
          const data = await res.json();
          setRiskReport(data.report);
        }
        if (id === "playbook" || id === "evidence") {
          const res = await fetch("/api/playbook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: "Pump P-101 vibration increasing" }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setPlaybook(data.playbook);
        }
      }
      await new Promise((r) => setTimeout(r, id === "problem" || id === "upload" || id === "corpus" || id === "closing" || id === "graph" || id === "investigate" ? 700 : 0));
      setStatus(id, "done");
    } catch (e) {
      setStatus(id, "error");
      toast.error(e instanceof Error ? e.message : "Step failed");
    }
  }, []);

  const runAll = async () => {
    setRunningAll(true);
    setStatuses({});
    for (const step of steps) {
      await runStep(step.id, mode);
    }
    setRunningAll(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Demo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "brain" ? "Industrial Brain — P-301 hero flow" : "IOM — P-101 organizational memory"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === "brain" ? "default" : "outline"} size="sm" onClick={() => { setMode("brain"); setStatuses({}); }}>
            Industrial Brain
          </Button>
          <Button variant={mode === "iom" ? "default" : "outline"} size="sm" onClick={() => { setMode("iom"); setStatuses({}); }}>
            IOM
          </Button>
          <Button onClick={runAll} disabled={runningAll}>
            {runningAll ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Running…</> : "Run full demo"}
          </Button>
        </div>
      </div>

      <ol className="space-y-4">
        {steps.map((step, i) => {
          const status = statuses[step.id] ?? "idle";
          return (
            <li key={step.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-sm">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold">{step.title}</h2>
                    {status === "done" && <Badge className="bg-emerald-500">Done</Badge>}
                    {status === "running" && <Badge className="animate-pulse">Running…</Badge>}
                    {status === "error" && <Badge variant="destructive">Error</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.caption}</p>

                  {mode === "brain" && step.id === "rca" && rca && status === "done" && (
                    <div className="mt-3 text-sm border rounded-lg p-3 bg-muted/40">
                      <p><strong>{rca.primaryHypothesis}</strong> — {rca.confidence}% confidence</p>
                      <Link href="/rca" className="text-primary text-xs mt-1 inline-block">Open RCA →</Link>
                    </div>
                  )}

                  {mode === "iom" && (step.id === "playbook" || step.id === "evidence") && playbook && status === "done" && (
                    <div className="mt-3 text-sm border rounded-lg p-3 bg-muted/40">
                      <p><strong>Root cause:</strong> {playbook.mostCommonRootCause}</p>
                      <p className="mt-1"><strong>Resolution:</strong> {playbook.previousSuccessfulResolution}</p>
                    </div>
                  )}

                  {mode === "iom" && step.id === "risk" && riskReport && status === "done" && (
                    <div className="mt-3 text-sm">
                      Aggregate risk score: <strong>{riskReport.aggregateRiskScore}%</strong>
                    </div>
                  )}

                  {status === "idle" && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => runStep(step.id, mode)}>
                      Run step
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-3 pt-4">
        {mode === "brain" ? (
          <>
            <Link href="/command"><Button variant="outline" size="sm">Command Center</Button></Link>
            <Link href="/assets/P-301"><Button variant="outline" size="sm">Asset P-301</Button></Link>
            <Link href="/copilot?q=Why+does+Pump+P-301+keep+failing%3F"><Button variant="outline" size="sm">Copilot</Button></Link>
            <Link href="/alerts"><Button variant="outline" size="sm">Alerts</Button></Link>
          </>
        ) : (
          <>
            <Link href="/knowledge-risk"><Button variant="outline" size="sm">Knowledge Risk</Button></Link>
            <Link href="/playbook"><Button variant="outline" size="sm">Playbook</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
