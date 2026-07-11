import { NextResponse } from "next/server";
import { generatePlaybook } from "@/lib/agents/playbook";
import { redis } from "@/lib/clients/redis";
import type { OperationalPlaybook } from "@/lib/agents/playbook-types";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_TTL = 60 * 30;

function cacheKey(query: string): string {
  return `iki:playbook:${crypto.createHash("sha256").update(query.trim().toLowerCase()).digest("hex").slice(0, 16)}`;
}

export async function POST(req: Request) {
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const key = cacheKey(query);
  try {
    const cached = await redis.get(key);
    if (cached) {
      return NextResponse.json({
        playbook: JSON.parse(cached) as OperationalPlaybook,
        cached: true,
      });
    }
  } catch {}

  try {
    const playbook = await generatePlaybook(query);
    try {
      await redis.set(key, JSON.stringify(playbook), "EX", CACHE_TTL);
    } catch {}
    return NextResponse.json({ playbook, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Playbook generation failed" },
      { status: 500 }
    );
  }
}
