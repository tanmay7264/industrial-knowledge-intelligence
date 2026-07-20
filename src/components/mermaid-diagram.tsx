"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export function MermaidDiagram({ chart, id = "diagram" }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          flowchart: { curve: "basis", useMaxWidth: true },
          themeVariables: {
            primaryColor: "#e8efe6",
            primaryTextColor: "#0b1613",
            primaryBorderColor: "#17402f",
            lineColor: "#4b5a52",
            secondaryColor: "#f2f5ee",
            tertiaryColor: "#ffffff",
            fontFamily: "var(--font-inter, sans-serif)",
          },
        });
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (failed) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs text-muted-foreground">
        {chart}
      </pre>
    );
  }

  return <div ref={ref} className="w-full [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" />;
}
