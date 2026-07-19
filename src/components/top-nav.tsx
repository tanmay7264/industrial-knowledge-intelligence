"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  MessageSquare,
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  GitBranch,
  Brain,
  MoreHorizontal,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/knowledge-risk", label: "Knowledge Risk", icon: AlertTriangle },
  { href: "/query", label: "Ask", icon: MessageSquare },
  { href: "/playbook", label: "Playbook", icon: BookOpen },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/graph", label: "Graph", icon: GitBranch },
];

type HealthData = Record<string, "ok" | "down">;

export function TopNav() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const fetchHealth = () =>
      fetch("/api/health")
        .then((r) => r.json())
        .then(setHealth)
        .catch(() => setHealth({ qdrant: "down", neo4j: "down", redis: "down" }));
    fetchHealth();
    const id = setInterval(fetchHealth, 20_000);
    return () => clearInterval(id);
  }, []);

  const allOnline = health !== null && Object.values(health).every((s) => s === "ok");

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border glass">
      <div className="flex h-full items-center gap-1 px-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2 pr-2 sm:pr-3 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 glow-primary">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <span className="font-heading font-bold tracking-tight text-base hidden sm:inline">
            IOM
          </span>
        </Link>

        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}

          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="hidden md:inline">More</span>
            </button>
            {moreOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-xl border bg-background shadow-lg py-1 min-w-[140px] z-50">
                {SECONDARY_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div
            className="hidden sm:flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground"
            title={allOnline ? "All systems online" : "Degraded"}
          >
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                health === null ? "bg-slate-400" : allOnline ? "bg-emerald-500" : "bg-destructive"
              }`}
            />
            <span>{health === null ? "Checking" : allOnline ? "Online" : "Degraded"}</span>
          </div>

        </div>
      </div>
    </header>
  );
}
