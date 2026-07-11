import { NextResponse } from "next/server";
import { buildKnowledgeRiskReport } from "@/lib/agents/knowledge-risk";

export const runtime = "nodejs";

export async function GET() {
  try {
    const report = await buildKnowledgeRiskReport();
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Knowledge risk report failed" },
      { status: 500 }
    );
  }
}
