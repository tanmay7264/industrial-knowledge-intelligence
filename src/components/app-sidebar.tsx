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
import { cn } from "@/lib/utils";

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
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary/20 text-sidebar-primary ring-1 ring-sidebar-primary/40"
          : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
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
      className={cn(
        "flex flex-col shrink-0 transition-all duration-200",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-primary/20 border border-sidebar-primary/40 shrink-0">
          <Brain className="h-4 w-4 text-sidebar-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm tracking-tight truncate text-sidebar-foreground">
              Industrial Brain
            </p>
            <p className="text-[10px] text-sidebar-foreground/55 truncate">
              Apex Steel · IOM
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {!collapsed && (
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
            Industrial Brain
          </p>
        )}
        <div className="space-y-0.5">
          {BRAIN_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>

        {!collapsed && (
          <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
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
        className="flex h-10 items-center justify-center border-t border-sidebar-border text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
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
