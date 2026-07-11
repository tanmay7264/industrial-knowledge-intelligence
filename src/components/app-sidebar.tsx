"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Boxes,
  FileText,
  GitBranch,
  Search,
  AlertTriangle,
  ShieldCheck,
  Bell,
  BookOpen,
  Play,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const BRAIN_NAV: NavItem[] = [
  { href: "/command", label: "Command Center", icon: LayoutDashboard },
  { href: "/copilot", label: "AI Copilot", icon: MessageSquare },
  { href: "/assets", label: "Asset 360", icon: Boxes },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/graph", label: "Knowledge Graph", icon: GitBranch },
  { href: "/rca", label: "RCA Workspace", icon: Search },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/alerts", label: "Alerts & Insights", icon: Bell },
];

const IOM_NAV: NavItem[] = [
  { href: "/knowledge-risk", label: "Knowledge Risk", icon: AlertTriangle },
  { href: "/playbook", label: "Playbook", icon: BookOpen },
  { href: "/demo", label: "Demo", icon: Play },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.label}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r border-border bg-background/95 shrink-0 transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 glow-primary shrink-0">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm tracking-tight truncate">
              Industrial Brain
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Apex Steel · IOM
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {!collapsed && (
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Industrial Brain
          </p>
        )}
        <div className="space-y-0.5">
          {BRAIN_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>

        {!collapsed && (
          <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Organizational Memory
          </p>
        )}
        <div className="space-y-0.5">
          {IOM_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-10 items-center justify-center border-t border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
