import { NextResponse } from "next/server";
import { getAssets, getTimeline } from "@/lib/seed";
import { findSimilarIncidents } from "@/lib/graph/retrieve";
import expertsData from "@/lib/agents/experts.json";

export const runtime = "nodejs";

interface ExpertProfile {
  id: string;
  name: string;
  experienceYears: number;
  retiringInMonths: number;
  incidentsSolved: number;
  assetsManaged: string[];
  knowledgeRiskScore: number;
  missingDocumentation: string[];
}

const experts = expertsData as ExpertProfile[];

const FAILURE_TYPE_KEYWORDS: [RegExp, string][] = [
  [/bearing/i, "Bearing Failure"],
  [/vibrat/i, "Vibration"],
  [/cavitat/i, "Cavitation"],
  [/overheat|temperature/i, "Overheating"],
  [/leak/i, "Leakage"],
  [/pressure/i, "Pressure Loss"],
  [/alignment/i, "Shaft Misalignment"],
  [/downtime|failure/i, "Production Downtime"],
];

function classifyFailureType(text: string): string {
  for (const [pattern, label] of FAILURE_TYPE_KEYWORDS) {
    if (pattern.test(text)) return label;
  }
  return "Operational Failure";
}

function resolveExpert(asset: string): ExpertProfile | undefined {
  return experts.find((e) =>
    e.assetsManaged.some((a) => a.toUpperCase() === asset.toUpperCase())
  );
}

export async function GET() {
  const assets = getAssets();
  const incidents: {
    id: string;
    asset: string;
    machineName: string;
    department: string;
    date?: string;
    summary: string;
    rootCause?: string;
    impact?: string;
    document: string | null;
    failureType: string;
    severity: "Critical" | "High" | "Medium" | "Low";
    similarityScore: number;
    knowledgeConfidence: number;
    resolvedBy: string;
    managerApproved: boolean;
    playbookAvailable: boolean;
  }[] = [];

  const assetIncidentCounts = new Map<string, number>();

  for (const tag of ["P-301", "P-101", "C-204"]) {
    const timeline = getTimeline(tag);
    const assetRecord = assets.find((a) => a.tag === tag);
    const assetIncidents = timeline.filter((e) => e.type === "incident");

    for (const event of assetIncidents) {
      const count = (assetIncidentCounts.get(tag) ?? 0) + 1;
      assetIncidentCounts.set(tag, count);

      const expert = resolveExpert(tag);
      const failureType = classifyFailureType(`${event.title} ${event.description}`);
      const hasDocument = Boolean(event.document);

      incidents.push({
        id: `${tag}-${event.date}`,
        asset: tag,
        machineName: assetRecord?.name ?? tag,
        department: assetRecord?.plantArea ?? "Unknown",
        date: event.date,
        summary: event.title,
        impact: event.description,
        document: event.document,
        failureType,
        severity:
          (assetRecord?.riskScore ?? 0) >= 70
            ? "Critical"
            : (assetRecord?.riskScore ?? 0) >= 50
              ? "High"
              : (assetRecord?.riskScore ?? 0) >= 30
                ? "Medium"
                : "Low",
        // Recurrence on the same asset is a cheap, honest proxy for pattern
        // match strength without running a full RCA per list row.
        similarityScore: Math.min(96, 62 + count * 12),
        knowledgeConfidence: hasDocument ? 90 : 58,
        resolvedBy: expert?.name ?? "Unassigned",
        managerApproved: hasDocument,
        playbookAvailable: true,
      });
    }
  }

  let graphIncidents: Awaited<ReturnType<typeof findSimilarIncidents>> = [];
  try {
    graphIncidents = await findSimilarIncidents("P-301");
    for (const inc of graphIncidents) {
      if (!incidents.some((i) => i.id === inc.id)) {
        const asset = inc.asset ?? "P-301";
        const assetRecord = assets.find((a) => a.tag === asset);
        const expert = resolveExpert(asset);
        incidents.push({
          id: inc.id,
          asset,
          machineName: assetRecord?.name ?? asset,
          department: assetRecord?.plantArea ?? "Unknown",
          date: inc.date,
          summary: inc.summary,
          rootCause: inc.rootCause,
          impact: undefined,
          document: null,
          failureType: classifyFailureType(`${inc.summary} ${inc.rootCause ?? ""}`),
          severity: "Medium",
          similarityScore: 70,
          knowledgeConfidence: inc.rootCause ? 85 : 55,
          resolvedBy: expert?.name ?? "Unassigned",
          managerApproved: Boolean(inc.rootCause),
          playbookAvailable: true,
        });
      }
    }
  } catch {
    // graph unavailable
  }

  const patterns = [
    {
      id: "pat-bearing",
      title: "Repeated bearing failures",
      assets: ["P-301", "P-305", "P-318"],
      description:
        "Three cooling water pumps showing bearing failure pattern without documented alignment checks.",
      confidence: 82,
    },
    {
      id: "pat-cavitation",
      title: "Cavitation-related failures",
      assets: ["P-301"],
      description:
        "Operator logs and OEM manual indicate cavitation as contributing factor.",
      confidence: 75,
    },
  ];

  const expertValidatedCases = incidents.filter(
    (i) => i.resolvedBy !== "Unassigned"
  ).length;

  return NextResponse.json({
    incidents: incidents.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    patterns,
    total: incidents.length,
    kpis: {
      historicalFailureCases: incidents.length,
      recurringFailurePatterns: patterns.length,
      expertValidatedCases,
      aiOperationalPlaybooks: 8,
    },
  });
}
