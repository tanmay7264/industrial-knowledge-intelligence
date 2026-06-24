"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/chat", label: "Copilot" },
  { href: "/graph", label: "Graph" },
  { href: "/compliance", label: "Compliance" },
  { href: "/ingest", label: "Ingest" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 h-12 shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex h-full items-center gap-1 px-3 sm:px-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 pr-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-bold tracking-tight text-sm">IKI</span>
        </Link>

        {/* Section links */}
        <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <Link
            href="/demo"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Guided Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
