import { NextResponse } from "next/server";
import { qdrant } from "@/lib/clients/qdrant";
import { driver as neo4jDriver } from "@/lib/clients/neo4j";
import Redis from "ioredis";

type Status = "ok" | "down";

async function pingQdrant(): Promise<Status> {
  try {
    await qdrant.getCollections();
    return "ok";
  } catch {
    return "down";
  }
}

async function pingNeo4j(): Promise<Status> {
  const session = neo4jDriver.session();
  try {
    await session.run("RETURN 1");
    return "ok";
  } catch {
    return "down";
  } finally {
    await session.close();
  }
}

async function pingRedis(): Promise<Status> {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
    // Fail fast when the server is genuinely unreachable instead of reconnecting
    retryStrategy: () => null,
  });

  try {
    await redis.connect();
    await redis.ping();
    return "ok";
  } catch {
    return "down";
  } finally {
    redis.disconnect();
  }
}

export async function GET() {
  const [qdrantStatus, neo4jStatus, redisStatus] = await Promise.all([
    pingQdrant(),
    pingNeo4j(),
    pingRedis(),
  ]);

  const services = {
    qdrant: qdrantStatus,
    neo4j: neo4jStatus,
    redis: redisStatus,
  };

  const healthy = Object.values(services).every((s) => s === "ok");

  return NextResponse.json(services, { status: healthy ? 200 : 503 });
}
