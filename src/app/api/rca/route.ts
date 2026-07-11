import { NextResponse } from "next/server";
import { generateRCA } from "@/lib/agents/rca";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    asset?: string;
    query?: string;
    failureEvent?: string;
  };

  const query =
    body.query ??
    (body.asset
      ? `Why does ${body.asset} keep failing?${body.failureEvent ? ` Event: ${body.failureEvent}` : ""}`
      : null);

  if (!query) {
    return NextResponse.json(
      { error: "Provide query or asset" },
      { status: 400 }
    );
  }

  try {
    const report = await generateRCA(query, body.asset);
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "RCA failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
