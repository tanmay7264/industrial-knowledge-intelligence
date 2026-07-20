"use client";

import { useEffect, useState } from "react";
import { Compass, Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { SidebarProvider, useSidebar } from "@/components/sidebar-context";
import { TourProvider, useTour } from "@/components/tour-context";
import { GuidedTour } from "@/components/guided-tour";
import { Button } from "@/components/ui/button";

type HealthData = Record<string, "ok" | "down">;

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const { openMobile } = useSidebar();
  const { start: startTour } = useTour();

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
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border glass flex items-center gap-2 sm:gap-3 px-3 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 lg:hidden"
            onClick={openMobile}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <GlobalSearch />
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={startTour}
              aria-label="Take the guided tour"
              title="Take the guided tour"
            >
              <Compass className="h-4 w-4" />
            </Button>
            <div
              className="hidden sm:flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground"
              title={allOnline ? "All systems online" : "Degraded"}
            >
              <span
                className={`inline-flex h-2 w-2 rounded-full ${
                  health === null
                    ? "bg-muted-foreground"
                    : allOnline
                      ? "bg-emerald-500"
                      : "bg-destructive"
                }`}
              />
              <span className="hidden sm:inline">
                {health === null ? "Checking" : allOnline ? "Online" : "Degraded"}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          {children}
        </main>
      </div>
      <GuidedTour />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <TourProvider>
        <AppShellInner>{children}</AppShellInner>
      </TourProvider>
    </SidebarProvider>
  );
}
