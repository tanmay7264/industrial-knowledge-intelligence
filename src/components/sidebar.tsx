"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  GitBranch,
  ShieldCheck,
  Upload,
  Play,
  Cpu,
} from "lucide-react";

const NAV = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageSquare, label: "Ask" },
  { href: "/graph", icon: GitBranch, label: "Graph" },
  { href: "/compliance", icon: ShieldCheck, label: "Compliance" },
  { href: "/ingest", icon: Upload, label: "Ingest" },
  { href: "/demo", icon: Play, label: "Guided Demo" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="dark fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-white/[0.06] bg-[#070a10]">
      {/* Brand mark */}
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-white/[0.06]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 glow-primary">
          <Cpu className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-1 px-2 py-4">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ${
                active
                  ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-white/[0.07] hover:text-foreground"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 whitespace-nowrap rounded-md bg-popover border border-border px-2 py-1 text-xs font-medium text-popover-foreground shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-100">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Live indicator */}
      <div className="flex shrink-0 items-center justify-center pb-4">
        <span className="relative flex h-2 w-2" title="Systems online">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>
    </aside>
  );
}
