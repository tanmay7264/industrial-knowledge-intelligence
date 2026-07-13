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
    <div
      className={cn(
        MAX_WIDTH[maxWidth],
        "mx-auto w-full min-w-0 px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6",
        className
      )}
    >
      <header className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-1 break-words">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
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
      ? "sm:grid-cols-2 xl:grid-cols-4"
      : cols === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div
      className={cn(
        "rounded-xl sm:rounded-2xl border border-border/60 bg-mesh p-4 sm:p-6",
        className
      )}
    >
      <div className={cn("grid grid-cols-1 gap-3 sm:gap-4", gridCols)}>
        {children}
      </div>
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
    <div className="card-rich rounded-xl border border-border/60 p-4 sm:p-5 min-w-0">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5 sm:mb-2">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-medium truncate">
              {label}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-heading tabular-nums tracking-tight break-words">
            {value}
          </p>
          {(trend !== undefined || trendLabel) && (
            <p
              className={cn(
                "text-[11px] sm:text-xs mt-1 sm:mt-1.5 flex items-center gap-1 font-medium break-words",
                trend === undefined
                  ? "text-muted-foreground"
                  : trendUp
                    ? "text-emerald-600"
                    : "text-red-600"
              )}
            >
              {trend !== undefined &&
                (trendUp ? (
                  <TrendingUp className="h-3 w-3 shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 shrink-0" />
                ))}
              <span className="min-w-0">
                {trendLabel ??
                  (trend !== undefined
                    ? `${trendUp ? "+" : ""}${trend}% vs last week`
                    : null)}
              </span>
            </p>
          )}
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline
            data={sparklineData}
            color={sparklineColor}
            className="hidden sm:block"
          />
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
    <div
      className={cn(
        "card-rich rounded-xl border border-border/60 p-4 sm:p-5 min-w-0 overflow-hidden",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
          {title && (
            <h2 className="font-semibold font-heading text-base sm:text-lg">{title}</h2>
          )}
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
    <div className="-mx-1 overflow-x-auto no-scrollbar">
      <div className="flex flex-nowrap sm:flex-wrap gap-2 px-1 pb-1 min-w-min sm:min-w-0">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs border transition-colors whitespace-nowrap shrink-0",
              value === opt.id
                ? "bg-primary/15 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/25"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResponsiveTableWrap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0", className)}>
      {children}
    </div>
  );
}
