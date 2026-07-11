import { NextResponse } from "next/server";
import { generateInsights } from "@/lib/agents/insights";

export const runtime = "nodejs";

export async function GET() {
  const insights = await generateInsights();
  return NextResponse.json({ insights, generatedAt: new Date().toISOString() });
}
