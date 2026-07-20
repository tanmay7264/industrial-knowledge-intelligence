import { NextRequest, NextResponse } from "next/server";
import { getAssets, getTimeline, type TimelineEvent } from "@/lib/seed";
import expertsData from "@/lib/agents/experts.json";
import { generateRCA } from "@/lib/agents/rca";
import { getLessonsForAsset } from "@/lib/graph/retrieve";

export const runtime = "nodejs";
export const maxDuration = 60;

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

function findIncidentEvent(
  id: string
): { asset: string; event: TimelineEvent } | null {
  for (const asset of getAssets()) {
    for (const event of getTimeline(asset.tag)) {
      if (`${asset.tag}-${event.date}` === id) {
        return { asset: asset.tag, event };
      }
    }
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetHint = req.nextUrl.searchParams.get("asset") ?? undefined;

  const found = findIncidentEvent(id);
  const asset = found?.asset ?? assetHint;
  if (!asset) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const assetRecord = getAssets().find(
    (a) => a.tag.toUpperCase() === asset.toUpperCase()
  );
  const title = found?.event.title ?? id;
  const query = [title, found?.event.description]
    .filter(Boolean)
    .join(" — ") || `${asset} failure investigation`;

  try {
    const [report, lessons] = await Promise.all([
      generateRCA(query, asset),
      getLessonsForAsset(asset),
    ]);

    const expert =
      experts.find((e) =>
        e.assetsManaged.some((a) => a.toUpperCase() === asset.toUpperCase())
      ) ?? null;

    const assetIncidentDates = getTimeline(asset)
      .filter((e) => e.type === "incident")
      .map((e) => e.date)
      .sort();

    const successCount = report.similarIncidents.filter(
      (i) => i.resolutionSuccess?.toLowerCase() === "successful"
    ).length;
    const successRate =
      report.similarIncidents.length > 0
        ? Math.round((successCount / report.similarIncidents.length) * 100)
        : report.confidence;

    const failureDNA = {
      machine: asset,
      failurePattern: report.primaryHypothesis,
      occurrence: Math.max(
        1,
        assetIncidentDates.length,
        report.similarIncidents.length
      ),
      firstSeen: assetIncidentDates[0] ?? found?.event.date ?? "Unknown",
      lastSeen:
        assetIncidentDates[assetIncidentDates.length - 1] ??
        found?.event.date ??
        "Unknown",
      successRate,
      expertName: expert?.name ?? "Unassigned",
      aiConfidence: report.confidence,
    };

    const resolutionTimeline = [
      {
        stage: "Inspection",
        detail:
          report.actionPlan.inspectionOrder[0] ??
          "Initial inspection scheduled",
      },
      { stage: "Diagnosis", detail: report.primaryHypothesis },
      {
        stage: "Repair",
        detail:
          report.actionPlan.repairProcedure[0] ?? "Corrective repair performed",
      },
      {
        stage: "Verification",
        detail:
          report.actionPlan.verificationChecklist[0] ??
          "Post-repair verification completed",
      },
      { stage: "Machine Restart", detail: "Asset returned to service" },
      { stage: "Monitoring", detail: "Condition monitored for recurrence" },
    ];

    return NextResponse.json({
      incident: {
        id,
        asset,
        machineName: assetRecord?.name ?? asset,
        department: assetRecord?.plantArea ?? "Unknown",
        date: found?.event.date ?? report.problemSummary.date,
        title: title || report.primaryHypothesis,
        document: found?.event.document ?? null,
      },
      report,
      lessons,
      expert,
      failureDNA,
      resolutionTimeline,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to build incident report",
      },
      { status: 500 }
    );
  }
}
