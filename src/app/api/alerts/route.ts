import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/seed";

export const runtime = "nodejs";

const acknowledged = new Set<string>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity") ?? undefined;
  const assetTag = searchParams.get("asset") ?? undefined;

  let alerts = getAlerts({ status: "open" });
  if (severity) {
    alerts = alerts.filter(
      (a) => a.severity.toLowerCase() === severity.toLowerCase()
    );
  }
  if (assetTag) {
    alerts = alerts.filter(
      (a) => a.assetTag.toUpperCase() === assetTag.toUpperCase()
    );
  }

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      ...a,
      status: acknowledged.has(a.id) ? "acknowledged" : a.status,
    })),
    total: alerts.length,
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { alertId?: string; action?: string };
  if (body.action === "acknowledge" && body.alertId) {
    acknowledged.add(body.alertId);
    return NextResponse.json({ ok: true, alertId: body.alertId });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
