import { NextResponse } from "next/server";
import { redis } from "@/lib/clients/redis";

export const runtime = "nodejs";

const KEY = "iki:knowledge:recent";
const MAX_ENTRIES = 50;

export interface KnowledgeFeedback {
  query: string;
  asset: string;
  engineerName: string;
  additionalSteps?: string;
  notes?: string;
  status: "Pending Manager Approval";
  createdAt: string;
}

// Engineer confirmation on a playbook result — this is how the org's memory
// actually grows. No approval workflow exists yet, so status is always
// "Pending Manager Approval"; add a real approval step when that's needed.
export async function POST(req: Request) {
  let body: Partial<KnowledgeFeedback>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.query || !body.asset || !body.engineerName?.trim()) {
    return NextResponse.json(
      { error: "query, asset and engineerName are required" },
      { status: 400 }
    );
  }

  const entry: KnowledgeFeedback = {
    query: body.query,
    asset: body.asset,
    engineerName: body.engineerName.trim(),
    additionalSteps: body.additionalSteps?.trim() || undefined,
    notes: body.notes?.trim() || undefined,
    status: "Pending Manager Approval",
    createdAt: new Date().toISOString(),
  };

  try {
    await redis.lpush(KEY, JSON.stringify(entry));
    await redis.ltrim(KEY, 0, MAX_ENTRIES - 1);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 }
    );
  }

  return NextResponse.json({ saved: true, entry });
}

export async function GET() {
  try {
    const raw = await redis.lrange(KEY, 0, 9);
    const entries: KnowledgeFeedback[] = raw.map((r) => JSON.parse(r));
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
