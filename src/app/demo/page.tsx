"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Timer } from "lucide-react";
import type { OperationalPlaybook } from "@/lib/agents/playbook-types";
import type { RCAReport } from "@/lib/agents/rca-types";
import type { KnowledgeRiskReport } from "@/lib/agents/knowledge-risk";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";

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
  const doneCount = steps.filter((s) => statuses[s.id] === "done").length;

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
          await fetch("/api/alerts").then((r) => r.json());
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
      await new Promise((r) =>
        setTimeout(
          r,
          ["problem", "upload", "corpus", "closing", "graph", "investigate"].includes(id)
            ? 700
            : 0
        )
      );
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
    <PageShell
      title="Demo"
      subtitle={
        mode === "brain"
          ? "Industrial Brain — P-301 hero flow"
          : "IOM — P-101 organizational memory"
      }
      maxWidth="sm"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === "brain" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("brain");
              setStatuses({});
            }}
          >
            Industrial Brain
          </Button>
          <Button
            variant={mode === "iom" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("iom");
              setStatuses({});
            }}
          >
            IOM
          </Button>
          <Button onClick={runAll} disabled={runningAll} className="glow-primary">
            {runningAll ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running…
              </>
            ) : (
              "Run full demo"
            )}
          </Button>
        </div>
      }
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Steps Complete"
            value={`${doneCount}/${steps.length}`}
            icon={Play}
            trend={doneCount > 0 ? 100 : 0}
            trendLabel={`${Math.round((doneCount / steps.length) * 100)}% progress`}
            sparklineData={sparklineFromSeed(doneCount + steps.length)}
          />
          <HeroMetricCard
            label="Demo Mode"
            value={mode === "brain" ? "Brain" : "IOM"}
            icon={Timer}
            trendLabel={mode === "brain" ? "P-301 flow" : "P-101 memory"}
            sparklineData={sparklineFromSeed(mode === "brain" ? 301 : 101)}
          />
          <HeroMetricCard
            label="Est. Duration"
            value="~3 min"
            icon={Timer}
            trendLabel="Full walkthrough"
            sparklineData={sparklineFromSeed(180)}
          />
        </HeroBand>
      }
    >
      <ol className="space-y-4">
        {steps.map((step, i) => {
          const status = statuses[step.id] ?? "idle";
          return (
            <li key={step.id}>
              <ContentCard className="p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-sm">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="font-semibold font-heading">{step.title}</h2>
                      {status === "done" && (
                        <Badge className="bg-emerald-500 text-white">Done</Badge>
                      )}
                      {status === "running" && (
                        <Badge className="animate-pulse">Running…</Badge>
                      )}
                      {status === "error" && (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.caption}</p>

                    {mode === "brain" && step.id === "rca" && rca && status === "done" && (
                      <div className="mt-3 text-sm rounded-lg border border-border/60 p-3 bg-muted/40">
                        <p>
                          <strong>{rca.primaryHypothesis}</strong> — {rca.confidence}%
                          confidence
                        </p>
                        <Link href="/rca" className="text-primary text-xs mt-1 inline-block">
                          Open RCA →
                        </Link>
                      </div>
                    )}

                    {mode === "iom" &&
                      (step.id === "playbook" || step.id === "evidence") &&
                      playbook &&
                      status === "done" && (
                        <div className="mt-3 text-sm rounded-lg border border-border/60 p-3 bg-muted/40">
                          <p>
                            <strong>Root cause:</strong> {playbook.mostCommonRootCause}
                          </p>
                          <p className="mt-1">
                            <strong>Resolution:</strong>{" "}
                            {playbook.previousSuccessfulResolution}
                          </p>
                        </div>
                      )}

                    {mode === "iom" && step.id === "risk" && riskReport && status === "done" && (
                      <div className="mt-3 text-sm">
                        Aggregate risk score:{" "}
                        <strong>{riskReport.aggregateRiskScore}%</strong>
                      </div>
                    )}

                    {status === "idle" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => runStep(step.id, mode)}
                      >
                        Run step
                      </Button>
                    )}
                  </div>
                </div>
              </ContentCard>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-3 pt-2">
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
    </PageShell>
  );
}
