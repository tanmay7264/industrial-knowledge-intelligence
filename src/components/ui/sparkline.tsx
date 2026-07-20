import { cn } from "@/lib/utils";

type SparklineProps = {
  data: number[];
  color?: string;
  className?: string;
  height?: number;
};

export function Sparkline({
  data,
  color = "oklch(0.337 0.055 163.4)",
  className,
  height = 40,
}: SparklineProps) {
  if (data.length < 2) return null;

  const width = 80;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 opacity-80", className)}
      width={width}
      height={height}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
