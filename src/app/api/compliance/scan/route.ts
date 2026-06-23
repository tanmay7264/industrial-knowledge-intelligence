import { runComplianceScan } from "@/lib/agents/compliance";
import { redis } from "@/lib/clients/redis";
import type { ComplianceReport } from "@/lib/agents/compliance";

export const runtime = "nodejs";
export const maxDuration = 300;

const CACHE_KEY = "iki:compliance:last-report";
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

async function readCache(): Promise<ComplianceReport | null> {
  try {
    const raw = await redis.get(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ComplianceReport) : null;
  } catch {
    return null;
  }
}

async function writeCache(report: ComplianceReport): Promise<void> {
  try {
    await redis.set(CACHE_KEY, JSON.stringify(report), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Redis unavailable — the report is still returned to the caller
  }
}

// Returns the last cached report (used by the dashboard on initial load)
export async function GET() {
  const cached = await readCache();
  return Response.json({ report: cached, cached: cached !== null });
}

// Runs a fresh scan over all requirements and caches the result
export async function POST() {
  try {
    const report = await runComplianceScan();
    await writeCache(report);
    return Response.json({ report, cached: false });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Compliance scan failed" },
      { status: 500 }
    );
  }
}
