import { NextResponse } from "next/server";
import { getTimeline } from "@/lib/seed";
import { findSimilarIncidents } from "@/lib/graph/retrieve";

export const runtime = "nodejs";

export async function GET() {
  const incidents: {
    id: string;
    asset: string;
    date?: string;
    summary: string;
    rootCause?: string;
    impact?: string;
  }[] = [];

  for (const tag of ["P-301", "P-101", "C-204"]) {
    const timeline = getTimeline(tag);
    for (const event of timeline.filter((e) => e.type === "incident")) {
      incidents.push({
        id: `${tag}-${event.date}`,
        asset: tag,
        date: event.date,
        summary: event.title,
        impact: event.description,
      });
    }
  }

  let graphIncidents: Awaited<ReturnType<typeof findSimilarIncidents>> = [];
  try {
    graphIncidents = await findSimilarIncidents("P-301");
    for (const inc of graphIncidents) {
      if (!incidents.some((i) => i.id === inc.id)) {
        incidents.push({
          id: inc.id,
          asset: inc.asset ?? "P-301",
          date: inc.date,
          summary: inc.summary,
          rootCause: inc.rootCause,
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

  return NextResponse.json({
    incidents: incidents.sort((a, b) =>
      (b.date ?? "").localeCompare(a.date ?? "")
    ),
    patterns,
    total: incidents.length,
  });
}
