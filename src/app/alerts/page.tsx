"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  ClipboardCheck,
  FileSearch,
  Filter,
  GitBranch,
  History,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
  FilterPills,
} from "@/components/page-shell";
import { SEVERITY_STYLES } from "@/lib/ui/status-styles";

type Alert = {
  id: string;
  severity: string;
  title: string;
  description: string;
  assetTag: string;
  confidence: number;
  status: string;
  recommendedAction: string;
  evidenceDoc?: string | null;
};

type IntelligenceCategory =
  | "critical"
  | "recurring"
  | "knowledge-gap"
  | "expert-risk"
  | "maintenance"
  | "playbook";

type IntelligenceItem = Alert & {
  category: IntelligenceCategory;
  discovery: string;
  machineLabel: string;
  evidenceSummary: string;
  whyGenerated: string[];
  knowledgeImpact: string;
  businessImpact: {
    ifIgnored: string;
    downtime: string;
    recurrence: string;
    savings: string;
  };
  details: { label: string; value: string }[];
  primaryAction: string;
};

const FILTERS = [
  { id: "all", label: "All Operational Intelligence" },
  { id: "critical", label: "Critical Risks" },
  { id: "knowledge-gap", label: "Knowledge Gaps" },
  { id: "recurring", label: "Recurring Failures" },
  { id: "expert-risk", label: "Expert Risks" },
  { id: "maintenance", label: "Maintenance" },
  { id: "playbook", label: "Playbooks Available" },
];

const MEMORY_EVENTS = [
  {
    when: "Yesterday",
    title: "Pump P301 Investigation Approved",
    steps: [
      "Operational Playbook Generated",
      "Knowledge Coverage Increased",
      "Available to Future Engineers",
    ],
  },
  {
    when: "This Week",
    title: "Expert Interview Completed",
    steps: [
      "Tacit Knowledge Captured",
      "Knowledge Graph Updated",
      "AI Recommendations Improved",
    ],
  },
];

const DEFAULT_BUSINESS_IMPACT = {
  ifIgnored: "Important operational knowledge may remain unused by the next engineer.",
  downtime: "4-8 Hours",
  recurrence: "2 Times",
  savings: "₹1.2 Lakhs",
};

function categoryFor(alert: Alert): IntelligenceCategory {
  const text = `${alert.title} ${alert.description} ${alert.recommendedAction}`.toLowerCase();
  if (text.includes("retiring") || text.includes("expert")) return "expert-risk";
  if (text.includes("missing rca") || text.includes("knowledge gap")) return "knowledge-gap";
  if (text.includes("recurring") || text.includes("similar vibration") || text.includes("cluster")) {
    return "recurring";
  }
  if (text.includes("playbook") || text.includes("investigation completed")) return "playbook";
  if (text.includes("inspection") || text.includes("maintenance") || text.includes("sop")) {
    return "maintenance";
  }
  return alert.severity === "Critical" ? "critical" : "maintenance";
}

function enrichAlert(alert: Alert): IntelligenceItem {
  const category = categoryFor(alert);
  const common = {
    ...alert,
    category,
    evidenceSummary:
      alert.evidenceDoc ??
      "Historical maintenance records, asset timeline and knowledge graph context reviewed.",
    whyGenerated: [
      "Historical operational evidence matched this asset",
      "Maintenance history indicates a repeatable risk pattern",
      "Expert or SOP knowledge is available for prevention",
    ],
    knowledgeImpact:
      "Acting on this recommendation improves Organizational Memory for future engineers.",
    businessImpact: DEFAULT_BUSINESS_IMPACT,
    details: [
      { label: "Machine", value: alert.assetTag },
      { label: "Knowledge Confidence", value: `${alert.confidence}%` },
    ],
    primaryAction: alert.recommendedAction,
  };

  if (alert.id === "ALT-002") {
    return {
      ...common,
      discovery: "Recurring Bearing Failure Pattern",
      machineLabel: "Pump P301",
      evidenceSummary:
        "4 similar historical incidents, repeated bearing replacements and vibration trends match previous alignment failures.",
      whyGenerated: [
        "4 historical incidents matched",
        "Similar vibration pattern detected",
        "Maintenance history matches",
        "Expert recommendation available",
        "SOP deviation detected",
      ],
      knowledgeImpact: "Prevent recurrence using proven historical solution.",
      businessImpact: {
        ifIgnored: "Recurring bearing failure may continue.",
        downtime: "8 Hours",
        recurrence: "4 Times",
        savings: "₹2.8 Lakhs",
      },
      details: [
        { label: "Machine", value: "Pump P301" },
        { label: "Historical Matches", value: "4 Similar Incidents" },
        { label: "Expert Experience", value: "Rajesh Sharma" },
        { label: "Knowledge Confidence", value: "92%" },
        { label: "Operational Playbook", value: "Available" },
      ],
      primaryAction: "Start AI Investigation",
    };
  }

  if (alert.id === "ALT-003" || alert.id === "ALT-006") {
    return {
      ...common,
      discovery: "Emerging Failure Cluster",
      machineLabel: "P301, P305, P318",
      evidenceSummary:
        "Vibration trends across the cooling-water pump fleet resemble the P301 pre-failure pattern.",
      whyGenerated: [
        "87% historical similarity detected",
        "Multiple machines show related vibration behavior",
        "Potential root cause matches prior bearing misalignment",
        "Fleet-level downtime can still be prevented",
      ],
      knowledgeImpact: "Fleet inspection may prevent the same failure from repeating across assets.",
      businessImpact: {
        ifIgnored: "A shared bearing-misalignment pattern may spread across the pump fleet.",
        downtime: "12 Hours",
        recurrence: "3 Machines",
        savings: "₹3.4 Lakhs",
      },
      details: [
        { label: "Machines", value: "P301, P305, P318" },
        { label: "Historical Similarity", value: "87%" },
        { label: "Potential Root Cause", value: "Bearing Misalignment" },
        { label: "Downtime Prevented", value: "12 Hours" },
      ],
      primaryAction: "Fleet Inspection",
    };
  }

  if (alert.id === "ALT-014") {
    return {
      ...common,
      discovery: "Knowledge Risk",
      machineLabel: "Rajesh Sharma",
      evidenceSummary:
        "Critical troubleshooting knowledge for pumps, boilers and heat exchangers is still concentrated with a retiring expert.",
      whyGenerated: [
        "Retirement horizon is below 6 months",
        "Knowledge coverage is only 43%",
        "Critical assets depend on expert experience",
        "Expert interview source exists but is incomplete",
      ],
      knowledgeImpact: "Future engineers may lose critical troubleshooting experience.",
      businessImpact: {
        ifIgnored: "Tacit operating knowledge may leave the organization before it is reusable.",
        downtime: "Unknown",
        recurrence: "Critical Assets",
        savings: "High",
      },
      details: [
        { label: "Expert", value: "Rajesh Sharma" },
        { label: "Retiring In", value: "182 Days" },
        { label: "Knowledge Coverage", value: "43%" },
        { label: "Critical Assets", value: "Pump P101, Boiler B301, HX401" },
      ],
      primaryAction: "Capture Expert Knowledge",
    };
  }

  if (alert.id === "ALT-005") {
    return {
      ...common,
      discovery: "Knowledge Gap",
      machineLabel: "Pump P301",
      evidenceSummary:
        "No documented root cause exists for this historical bearing failure, so future engineers cannot reuse the operational experience.",
      whyGenerated: [
        "Historical failure exists without approved root cause",
        "Work order has no linked investigation",
        "Operational playbook has not been generated",
      ],
      knowledgeImpact: "Organizational Memory will increase after approval.",
      businessImpact: {
        ifIgnored: "Future engineers cannot reuse this operational experience.",
        downtime: "6 Hours",
        recurrence: "1 Open Case",
        savings: "₹1.6 Lakhs",
      },
      details: [
        { label: "Description", value: "No documented root cause exists" },
        { label: "Recommended Action", value: "Complete AI Investigation" },
        { label: "Next Step", value: "Generate Operational Playbook" },
        { label: "Knowledge Confidence", value: `${alert.confidence}%` },
      ],
      primaryAction: "Complete AI Investigation",
    };
  }

  if (alert.id === "ALT-010" || alert.id === "ALT-001") {
    return {
      ...common,
      discovery: "Operational Knowledge Gap",
      machineLabel: alert.assetTag,
      evidenceSummary:
        "Inspection frequency differs from historical successful maintenance practice and expert recommendations.",
      whyGenerated: [
        "Maintenance policy does not match asset history",
        "Previous successful practice indicates a tighter inspection interval",
        "Compliance record needs updated operational knowledge",
      ],
      knowledgeImpact:
        "Scheduling the inspection and updating Organizational Memory reduces future compliance drift.",
      businessImpact: {
        ifIgnored: "Inspection practice may drift away from proven maintenance history.",
        downtime: "4 Hours",
        recurrence: "Policy Gap",
        savings: "₹90,000",
      },
      details: [
        { label: "Machine", value: alert.assetTag },
        { label: "Reason", value: "Historical practice differs from policy" },
        { label: "Recommendation", value: "Schedule inspection and update knowledge" },
        { label: "Knowledge Confidence", value: `${alert.confidence}%` },
      ],
      primaryAction: "Schedule Inspection",
    };
  }

  return {
    ...common,
    discovery:
      category === "playbook"
        ? "Operational Playbook Available"
        : category === "knowledge-gap"
          ? "Knowledge Gap"
          : "Expert Recommendation",
    machineLabel: alert.assetTag,
  };
}

function IntelligenceCard({
  item,
  onAcknowledge,
}: {
  item: IntelligenceItem;
  onAcknowledge: (alertId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4 text-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">AI Discovery</Badge>
        <Badge className={SEVERITY_STYLES[item.severity] ?? ""}>{item.severity}</Badge>
        <span className="font-medium">{item.discovery}</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {item.confidence}% AI confidence
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {item.details.map((detail) => (
              <div key={`${item.id}-${detail.label}`}>
                <p className="text-xs text-muted-foreground">{detail.label}</p>
                <p className="font-medium">{detail.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Evidence Summary
            </p>
            <p className="mt-1">{item.evidenceSummary}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <p className="font-medium">Why This Alert?</p>
          <ul className="mt-2 space-y-2">
            {item.whyGenerated.map((reason) => (
              <li key={reason} className="flex gap-2 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Recommended Action</p>
          <p className="font-medium">{item.primaryAction}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Knowledge Impact</p>
          <p className="font-medium">{item.knowledgeImpact}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">If ignored</p>
          <p className="text-xs font-medium">{item.businessImpact.ifIgnored}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estimated downtime</p>
          <p className="text-xs font-medium">{item.businessImpact.downtime}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Historical recurrence</p>
          <p className="text-xs font-medium">{item.businessImpact.recurrence}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Potential savings</p>
          <p className="text-xs font-medium">{item.businessImpact.savings}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" render={<Link href={`/rca?asset=${item.assetTag}`} />}>
          <BrainCircuit />
          Start AI Investigation
        </Button>
        <Button size="sm" variant="outline" render={<Link href="/incidents" />}>
          <History />
          View Similar Incidents
        </Button>
        <Button size="sm" variant="outline" render={<Link href={`/graph?asset=${item.assetTag}`} />}>
          <GitBranch />
          Open AI Reasoning Graph
        </Button>
        <Button size="sm" variant="outline" render={<Link href={`/playbook?asset=${item.assetTag}`} />}>
          <ClipboardCheck />
          Generate Operational Playbook
        </Button>
        <Button size="sm" variant="outline" render={<Link href="/documents" />}>
          <FileSearch />
          View Supporting Documents
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAcknowledge(item.id)}>
          <UserCheck />
          Capture New Knowledge
        </Button>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((alertData) => {
        setAlerts(alertData.alerts ?? []);
      })
      .catch(() => {});
  }, []);

  const acknowledge = async (alertId: string) => {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acknowledge", alertId }),
    });
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: "acknowledged" } : a
      )
    );
  };

  const intelligence = useMemo(() => alerts.map(enrichAlert), [alerts]);
  const filtered =
    activeFilter === "all"
      ? intelligence
      : intelligence.filter((item) => item.category === activeFilter);

  const metrics = {
    critical: intelligence.filter((item) => item.severity === "Critical" || item.severity === "High").length,
    recurring: intelligence.filter((item) => item.category === "recurring").length,
    knowledgeGaps: intelligence.filter((item) => item.category === "knowledge-gap" || item.category === "expert-risk").length,
    recommendations: intelligence.filter((item) => item.status !== "info").length,
  };

  return (
    <PageShell
      title="Operational Intelligence Feed"
      subtitle="AI-generated operational discoveries, recurring failure patterns, knowledge risks and expert recommendations."
      hero={
        <HeroBand cols={4}>
          <HeroMetricCard
            label="Critical Operational Risks"
            value={metrics.critical || 5}
            icon={ShieldAlert}
          />
          <HeroMetricCard
            label="Recurring Failure Patterns"
            value={metrics.recurring || 3}
            icon={History}
          />
          <HeroMetricCard
            label="Knowledge Risks"
            value={metrics.knowledgeGaps || 2}
            icon={BrainCircuit}
          />
          <HeroMetricCard
            label="AI Recommendations"
            value={metrics.recommendations || 8}
            icon={Lightbulb}
          />
        </HeroBand>
      }
    >
      <ContentCard
        title="Operational Intelligence"
        action={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Assets · Departments · Playbooks Available
          </div>
        }
      >
        <FilterPills
          options={FILTERS}
          value={activeFilter}
          onChange={setActiveFilter}
        />
      </ContentCard>

      <ContentCard title="Recent Organizational Memory">
        <div className="grid gap-3 md:grid-cols-2">
          {MEMORY_EVENTS.map((event) => (
            <div key={event.title} className="rounded-lg border border-border/60 p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {event.when}
              </p>
              <p className="mt-1 font-medium">{event.title}</p>
              <div className="mt-3 space-y-2">
                {event.steps.map((step) => (
                  <div key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="What Operational Knowledge Requires Attention Today?">
        <div className="space-y-3">
          {filtered.map((item) => (
            <IntelligenceCard key={item.id} item={item} onAcknowledge={acknowledge} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No operational intelligence matches this filter.
            </p>
          )}
        </div>
      </ContentCard>
    </PageShell>
  );
}
