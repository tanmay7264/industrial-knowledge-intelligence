"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GitBranch,
  Mic,
  PlayCircle,
  ShieldCheck,
  UserCheck,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExpertProfile, KnowledgeRiskReport } from "@/lib/agents/knowledge-risk";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";

type ExpertMemory = ExpertProfile & {
  designation: string;
  coverage: number;
  pending: number;
  businessImpact: string;
  retiringLabel: string;
  knowledgeDna: {
    historicalFailures: number;
    operationalPlaybooks: number;
    lessonsLearned: number;
    expertInterviews: number;
    videosCaptured: number;
    knowledgeCoverage: number;
  };
  interviewTopics: string[];
};

const CAPTURE_TIMELINE = [
  "Interview Scheduled",
  "Interview Completed",
  "Transcript Generated",
  "Operational Playbook Created",
  "Manager Approval",
  "Knowledge Graph Updated",
  "Available Across Industrial Brain",
];

const TACIT_KNOWLEDGE_GAPS = [
  "Emergency Shutdown Procedure",
  "Hidden Troubleshooting Techniques",
  "Temporary Failure Workarounds",
  "Seasonal Startup Checklist",
  "Operator Decision Rules",
  "Lessons Learned Not Yet Documented",
];

const INTERVIEW_TOPICS = [
  "How do you diagnose early bearing failure?",
  "Which failures are difficult to detect?",
  "What shortcuts reduce downtime?",
  "What knowledge is missing from SOPs?",
  "Which operator mistakes are most common?",
];

function riskColor(score: number): string {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

function assetName(asset: string): string {
  const names: Record<string, string> = {
    "P-101": "Pump P101",
    "B-11": "Boiler B11",
    "T-4": "Turbine T4",
    "HX-201": "Heat Exchanger HX201",
    "V-201": "Pressure Vessel V201",
  };
  return names[asset] ?? asset;
}

function designationFor(expert: ExpertProfile): string {
  if (expert.experienceYears >= 32) return "Senior Reliability Engineer";
  if (expert.experienceYears >= 25) return "Principal Maintenance Specialist";
  return "Operations Knowledge Owner";
}

function enrichExpert(expert: ExpertProfile): ExpertMemory {
  const coverage = Math.max(38, Math.min(82, 100 - Math.round(expert.knowledgeRiskScore * 0.45)));
  const retiringDays = Math.max(1, expert.retiringInMonths * 30 + 2);

  return {
    ...expert,
    designation: designationFor(expert),
    coverage,
    pending: 100 - coverage,
    businessImpact: expert.knowledgeRiskScore >= 85 ? "Critical" : expert.knowledgeRiskScore >= 65 ? "Medium" : "Managed",
    retiringLabel: `${retiringDays} Days`,
    knowledgeDna: {
      historicalFailures: expert.incidentsSolved,
      operationalPlaybooks: Math.max(3, Math.round(expert.incidentsSolved / 18)),
      lessonsLearned: expert.graphLessons ?? Math.max(8, Math.round(expert.incidentsSolved / 6)),
      expertInterviews: Math.max(2, Math.round(expert.experienceYears / 3)),
      videosCaptured: Math.max(1, Math.round(expert.experienceYears / 4)),
      knowledgeCoverage: coverage,
    },
    interviewTopics: INTERVIEW_TOPICS,
  };
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ExpertCard({ expert }: { expert: ExpertMemory }) {
  const [interviewOpen, setInterviewOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-heading text-lg font-bold">{expert.name}</p>
          <p className="text-sm text-muted-foreground">{expert.designation}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {expert.experienceYears} Years Experience · {expert.incidentsSolved} Failures Resolved
          </p>
        </div>
        <Badge className={`${riskColor(expert.knowledgeRiskScore)} text-white`}>
          {expert.knowledgeRiskScore}% Knowledge Risk
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Retiring In</p>
          <p className="font-medium">{expert.retiringLabel}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Knowledge Captured</p>
          <p className="font-medium">{expert.coverage}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pending Capture</p>
          <p className="font-medium">{expert.pending}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Business Impact</p>
          <p className="font-medium">{expert.businessImpact}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Current Capture Progress</span>
          <span className="font-medium">{expert.coverage}%</span>
        </div>
        <ProgressBar value={expert.coverage} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs text-muted-foreground">Critical Assets</p>
        <div className="flex flex-wrap gap-2">
          {expert.assetsManaged.map((asset) => (
            <Badge key={asset} variant="outline">
              {assetName(asset)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border/60 p-4">
        <p className="mb-3 font-medium">Knowledge DNA</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-2xl font-bold font-heading">{expert.knowledgeDna.historicalFailures}</p>
            <p className="text-xs text-muted-foreground">Historical Failures Solved</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{expert.knowledgeDna.operationalPlaybooks}</p>
            <p className="text-xs text-muted-foreground">Operational Playbooks</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{expert.knowledgeDna.lessonsLearned}</p>
            <p className="text-xs text-muted-foreground">Lessons Learned</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{expert.knowledgeDna.expertInterviews}</p>
            <p className="text-xs text-muted-foreground">Expert Interviews</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{expert.knowledgeDna.videosCaptured}</p>
            <p className="text-xs text-muted-foreground">Videos Captured</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-heading">{expert.knowledgeDna.knowledgeCoverage}%</p>
            <p className="text-xs text-muted-foreground">Knowledge Coverage</p>
          </div>
        </div>
      </div>

      {expert.missingDocumentation.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-700">Critical Knowledge Still Uncaptured</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[...expert.missingDocumentation, ...TACIT_KNOWLEDGE_GAPS.slice(0, 2)].map((gap) => (
              <div key={gap} className="flex gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setInterviewOpen((open) => !open)}>
          <Mic />
          Start AI Knowledge Interview
        </Button>
        <Button size="sm" variant="outline" render={<Link href="/playbook" />}>
          <ClipboardCheck />
          Generate Operational Playbook
        </Button>
        <Button size="sm" variant="outline" render={<Link href="/documents" />}>
          <FileText />
          Capture Expert Notes
        </Button>
        <Button size="sm" variant="outline">
          <Video />
          Record Video Demonstration
        </Button>
        <Button size="sm" variant="outline" render={<Link href="/graph" />}>
          <GitBranch />
          View Knowledge Graph
        </Button>
        <Button size="sm" variant="outline">
          <ShieldCheck />
          Approve Knowledge
        </Button>
      </div>

      {interviewOpen && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="font-medium">Suggested Interview Topics</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {expert.interviewTopics.map((topic) => (
              <div key={topic} className="text-sm text-muted-foreground">
                {topic}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeRiskPage() {
  const [report, setReport] = useState<KnowledgeRiskReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge-risk")
      .then((r) => r.json())
      .then((d) => setReport(d.report ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  const experts = useMemo(
    () => (report?.experts ?? []).map(enrichExpert),
    [report?.experts]
  );
  const captured = experts.length
    ? Math.round(experts.reduce((sum, expert) => sum + expert.coverage, 0) / experts.length)
    : 71;
  const pending = 100 - captured;
  const nearRetirement = experts.filter((expert) => expert.retiringInMonths <= 18).length;
  const criticalKnowledgeAssets = new Set(experts.flatMap((expert) => expert.assetsManaged)).size || 7;
  const topExpert = experts[0];

  return (
    <PageShell
      title="Knowledge Risk Dashboard"
      subtitle="Protect organizational memory before expertise is lost. Track critical knowledge, prioritize capture and preserve operational experience."
      maxWidth="xl"
      hero={
        <HeroBand cols={4}>
          <HeroMetricCard
            label="Critical Knowledge Assets"
            value={criticalKnowledgeAssets}
            icon={BookOpen}
          />
          <HeroMetricCard
            label="Experts Near Retirement"
            value={nearRetirement || 3}
            icon={UserCheck}
          />
          <HeroMetricCard
            label="Knowledge Captured"
            value={`${captured}%`}
            icon={BrainCircuit}
          />
          <HeroMetricCard
            label="Knowledge Pending"
            value={`${pending}%`}
            icon={FileText}
          />
        </HeroBand>
      }
    >
      {loading && (
        <p className="text-muted-foreground text-sm">Loading knowledge risk report...</p>
      )}

      {report && (
        <div className="space-y-4 sm:space-y-6">
          <ContentCard
            title="What Will We Forget?"
            className="border-primary/30 bg-primary/5"
            action={
              <Button render={<Link href="/documents" />}>
                <Mic />
                Start AI Knowledge Capture Session
              </Button>
            }
          >
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-sm text-muted-foreground">
                  If {topExpert?.name ?? "Engineer Rajesh Sharma"} retires today
                </p>
                <ul className="mt-4 space-y-3 text-sm">
                  <li>432 historical troubleshooting experiences become unavailable</li>
                  <li>4 critical assets lose their primary expert</li>
                  <li>11 undocumented repair techniques remain uncaptured</li>
                  <li>AI confidence for Pump P101 decreases from 94% to 72%</li>
                  <li>Organizational Knowledge Coverage decreases by 18%</li>
                </ul>
                <p className="mt-4 text-sm font-medium">
                  Recommendation: Start AI Knowledge Capture Session
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                <p className="mb-2 text-sm font-semibold">Knowledge Coverage</p>
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span>Captured Knowledge</span>
                    <span>{captured}%</span>
                  </div>
                  <ProgressBar value={captured} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span>Remaining Knowledge</span>
                    <span>{pending}%</span>
                  </div>
                  <ProgressBar value={pending} />
                </div>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Knowledge Transfer Timeline">
            <div className="grid gap-2 md:grid-cols-7">
              {CAPTURE_TIMELINE.map((step, index) => (
                <div key={step} className="rounded-lg border border-border/60 p-3 text-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    {index < CAPTURE_TIMELINE.length - 1 && (
                      <ChevronRight className="hidden h-4 w-4 text-muted-foreground md:block" />
                    )}
                  </div>
                  <p className="text-xs font-medium">{step}</p>
                </div>
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Knowledge Capture Priority">
            <div className="space-y-3">
              {experts.map((expert, index) => (
                <div
                  key={expert.id}
                  className="grid gap-3 rounded-lg border border-border/60 p-4 text-sm md:grid-cols-[0.5fr_1fr_0.8fr_0.8fr_0.8fr_1fr]"
                >
                  <p className="font-medium">Priority {index + 1}</p>
                  <p>{expert.name}</p>
                  <p>
                    <span className="text-muted-foreground">Retires </span>
                    {expert.retiringLabel}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Coverage </span>
                    {expert.coverage}%
                  </p>
                  <p>
                    <span className="text-muted-foreground">Impact </span>
                    {expert.businessImpact}
                  </p>
                  <p className="font-medium text-primary">
                    {index === 0 ? "Capture Immediately" : "Schedule Capture"}
                  </p>
                </div>
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Knowledge Owners">
            <div className="space-y-4">
              {experts.map((expert) => (
                <ExpertCard key={expert.id} expert={expert} />
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Asset Knowledge Dependency">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {report.criticalAssets.map(({ asset, expertCount, riskLevel }, index) => {
                const primaryExperts = experts
                  .filter((expert) => expert.assetsManaged.includes(asset))
                  .map((expert) => expert.name)
                  .join(", ");
                const coverage = Math.max(38, captured - index * 5);
                return (
                  <Link
                    key={asset}
                    href={`/assets/${asset}`}
                    className="card-rich rounded-xl border border-border/60 p-4 group"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-heading font-bold">{assetName(asset)}</p>
                        <p className="text-xs text-muted-foreground">{asset}</p>
                      </div>
                      <Badge variant="outline">{riskLevel} Risk</Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Knowledge Coverage</p>
                        <p className="font-medium">{coverage}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Primary Experts</p>
                        <p className="font-medium">{primaryExperts || `${expertCount} expert(s)`}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-muted-foreground">Historical Failures</p>
                          <p className="font-medium">{14 + index * 3}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Playbooks</p>
                          <p className="font-medium">{3 + (index % 3)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Business Impact</p>
                        <p className="font-medium">{riskLevel === "High" ? "Critical" : "Medium"}</p>
                      </div>
                    </div>
                    <ChevronRight className="mt-3 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          </ContentCard>

          <ContentCard title="Critical Knowledge Still Uncaptured">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TACIT_KNOWLEDGE_GAPS.map((gap) => (
                <div key={gap} className="rounded-lg border border-border/60 p-4 text-sm">
                  <p className="font-medium">{gap}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Capture this tacit knowledge before it disappears from operational memory.
                  </p>
                </div>
              ))}
            </div>
          </ContentCard>

          <Button className="gap-2 glow-primary" render={<Link href="/documents" />}>
            Launch Knowledge Capture Session
            <PlayCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </PageShell>
  );
}
