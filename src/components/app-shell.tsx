"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";

type HealthData = Record<string, "ok" | "down">;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    const fetchHealth = () =>
      fetch("/api/health")
        .then((r) => r.json())
        .then(setHealth)
        .catch(() =>
          setHealth({ qdrant: "down", neo4j: "down", redis: "down" })
        );
    fetchHealth();
    const id = setInterval(fetchHealth, 20_000);
    return () => clearInterval(id);
  }, []);

  const allOnline =
    health !== null && Object.values(health).every((s) => s === "ok");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border glass flex items-center gap-3 px-4">
          <GlobalSearch />
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div
              className="hidden sm:flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground"
              title={allOnline ? "All systems online" : "Degraded"}
            >
              <span
                className={`inline-flex h-2 w-2 rounded-full ${
                  health === null
                    ? "bg-slate-400"
                    : allOnline
                      ? "bg-emerald-500"
                      : "bg-destructive"
                }`}
              />
              <span>
                {health === null ? "Checking" : allOnline ? "Online" : "Degraded"}
              </span>
            </div>
            <Link
              href="/demo"
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap glow-primary"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Demo</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
