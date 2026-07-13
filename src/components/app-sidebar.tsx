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
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-context";

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

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.label}
      onClick={onNavigate}
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

function SidebarPanel({
  collapsed,
  onCollapse,
  onNavigate,
  showClose,
  onClose,
  className,
}: {
  collapsed: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-sidebar-border",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-primary/20 border border-sidebar-primary/40 shrink-0">
          <Brain className="h-4 w-4 text-sidebar-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-sm tracking-tight truncate text-sidebar-foreground">
              Industrial Brain
            </p>
            <p className="text-[10px] text-sidebar-foreground/55 truncate">
              Apex Steel · IOM
            </p>
          </div>
        )}
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4 overscroll-contain">
        {!collapsed && (
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
            Industrial Brain
          </p>
        )}
        <div className="space-y-0.5">
          {BRAIN_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {!collapsed && (
          <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
            Organizational Memory
          </p>
        )}
        <div className="space-y-0.5">
          {IOM_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          className="hidden lg:flex h-10 items-center justify-center border-t border-sidebar-border text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      )}
    </aside>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { mobileOpen, closeMobile } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:flex shrink-0 border-r border-sidebar-border transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <SidebarPanel
          collapsed={collapsed}
          onCollapse={() => setCollapsed((c) => !c)}
          className="w-full"
        />
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] border-r border-sidebar-border shadow-2xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
      >
        <SidebarPanel
          collapsed={false}
          onNavigate={closeMobile}
          showClose
          onClose={closeMobile}
          className="h-full"
        />
      </div>
    </>
  );
}
