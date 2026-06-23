"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ServiceStatus = "ok" | "down";
type HealthData = Record<string, ServiceStatus>;

const SERVICE_LABELS: Record<string, string> = {
  qdrant: "Qdrant",
  neo4j: "Neo4j",
  redis: "Redis",
};

export function StatusPanel() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/health");
        const data: HealthData = await res.json();
        setHealth(data);
      } catch {
        setHealth({ qdrant: "down", neo4j: "down", redis: "down" });
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Infrastructure Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))
          : Object.entries(SERVICE_LABELS).map(([key, label]) => {
              const status = health?.[key] ?? "down";
              const isOk = status === "ok";
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <Badge
                    className={
                      isOk
                        ? "bg-emerald-500 hover:bg-emerald-500 text-white border-transparent"
                        : "bg-destructive text-destructive-foreground border-transparent"
                    }
                  >
                    <span
                      className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                        isOk ? "bg-white" : "bg-white/80"
                      }`}
                    />
                    {isOk ? "online" : "offline"}
                  </Badge>
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
}
