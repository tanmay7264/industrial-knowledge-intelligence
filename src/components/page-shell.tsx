import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";

type IconComponent = React.ElementType<{ className?: string }>;

type PageShellProps = {
  title: React.ReactNode;
  subtitle?: string;
  hero?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  actions?: React.ReactNode;
};

const MAX_WIDTH: Record<NonNullable<PageShellProps["maxWidth"]>, string> = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export function PageShell({
  title,
  subtitle,
  hero,
  children,
  className,
  maxWidth = "xl",
  actions,
}: PageShellProps) {
  return (
    <div className={cn(MAX_WIDTH[maxWidth], "mx-auto w-full p-6 space-y-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {actions}
      </header>
      {hero}
      {children}
    </div>
  );
}

export function HeroBand({
  children,
  cols = 3,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols =
    cols === 4
      ? "md:grid-cols-2 xl:grid-cols-4"
      : cols === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-mesh p-5 sm:p-6",
        className
      )}
    >
      <div className={cn("grid grid-cols-1 gap-4", gridCols)}>{children}</div>
    </div>
  );
}

type HeroMetricCardProps = {
  label: string;
  value: React.ReactNode;
  icon: IconComponent;
  trend?: number;
  trendLabel?: string;
  sparklineData?: number[];
  sparklineColor?: string;
};

export function HeroMetricCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  sparklineData,
  sparklineColor,
}: HeroMetricCardProps) {
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <div className="card-rich rounded-xl border border-border/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-xs uppercase tracking-wider font-medium truncate">
              {label}
            </span>
          </div>
          <p className="text-3xl font-bold font-heading tabular-nums tracking-tight">
            {value}
          </p>
          {(trend !== undefined || trendLabel) && (
            <p
              className={cn(
                "text-xs mt-1.5 flex items-center gap-1 font-medium",
                trend === undefined
                  ? "text-muted-foreground"
                  : trendUp
                    ? "text-emerald-600"
                    : "text-red-600"
              )}
            >
              {trend !== undefined &&
                (trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                ))}
              {trendLabel ??
                (trend !== undefined
                  ? `${trendUp ? "+" : ""}${trend}% vs last week`
                  : null)}
            </p>
          )}
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} color={sparklineColor} />
        )}
      </div>
    </div>
  );
}

export function ContentCard({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("card-rich rounded-xl border border-border/60 p-5", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 gap-2">
          {title && <h2 className="font-semibold font-heading">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "px-3 py-1 rounded-full text-xs border transition-colors",
            value === opt.id
              ? "bg-primary/15 border-primary/40 text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-primary/25"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
