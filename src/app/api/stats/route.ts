import { NextResponse } from "next/server";
import { qdrant } from "@/lib/clients/qdrant";
import { driver } from "@/lib/clients/neo4j";
import { redis } from "@/lib/clients/redis";
import { COLLECTION } from "@/lib/ingest/qdrant-store";
import { countIncidents } from "@/lib/graph/retrieve";
import {
  getExpertsCount,
  getAggregateRiskScore,
} from "@/lib/agents/knowledge-risk";

// Real count of playbooks actually generated (cached), not a fabricated number.
async function countPlaybooks(): Promise<number> {
  try {
    return (await redis.keys("iki:playbook:*")).length;
  } catch {
    return 0;
  }
}

export const runtime = "nodejs";

interface CorpusStats {
  documents: number;
  chunks: number;
}

// Distinct documents (by file hash) and total chunks currently indexed in Qdrant.
async function getCorpusStats(): Promise<CorpusStats> {
  const docHashes = new Set<string>();
  let chunks = 0;

  try {
    const counted = await qdrant.count(COLLECTION, { exact: true });
    chunks = counted.count;

    let offset: string | number | Record<string, unknown> | undefined | null;
    let pages = 0;
    do {
      const res = await qdrant.scroll(COLLECTION, {
        limit: 256,
        with_payload: { include: ["fileHash", "fileName"] },
        with_vector: false,
        offset: offset ?? undefined,
      });
      for (const point of res.points) {
        const payload = (point.payload ?? {}) as Record<string, unknown>;
        const key = payload.fileHash ?? payload.fileName;
        if (key) docHashes.add(String(key));
      }
      offset = res.next_page_offset;
      pages++;
    } while (offset && pages < 50);
  } catch {
    // Collection may not exist yet (nothing ingested) — report zeros.
  }

  return { documents: docHashes.size, chunks };
}

function toNum(value: unknown): number {
  if (value == null) return 0;
  const v = value as { toNumber?: () => number };
  return typeof v.toNumber === "function" ? v.toNumber() : Number(value);
}

interface GraphStats {
  graphNodes: number;
  graphByType: Record<string, number>;
}

// Total node count plus a breakdown by primary label, for the composition chart.
async function getGraphStats(): Promise<GraphStats> {
  const session = driver.session();
  try {
    const result = await session.run(
      "MATCH (n) RETURN labels(n)[0] AS label, count(*) AS c"
    );
    const graphByType: Record<string, number> = {};
    let graphNodes = 0;
    for (const rec of result.records) {
      const label = rec.get("label") ?? "Other";
      const c = toNum(rec.get("c"));
      graphByType[String(label)] = c;
      graphNodes += c;
    }
    return { graphNodes, graphByType };
  } catch {
    return { graphNodes: 0, graphByType: {} };
  } finally {
    await session.close();
  }
}

export async function GET() {
  const [corpus, graph, incidentsIndexed, playbooksGenerated] = await Promise.all([
    getCorpusStats(),
    getGraphStats(),
    countIncidents(),
    countPlaybooks(),
  ]);

  return NextResponse.json({
    ...corpus,
    ...graph,
    expertsTracked: getExpertsCount(),
    incidentsIndexed,
    knowledgeRiskScore: getAggregateRiskScore(),
    playbooksGenerated,
  });
}
