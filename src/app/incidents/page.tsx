"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type IncidentsData = {
  incidents: {
    id: string;
    asset: string;
    date?: string;
    summary: string;
    rootCause?: string;
    impact?: string;
  }[];
  patterns: {
    id: string;
    title: string;
    assets: string[];
    description: string;
    confidence: number;
  }[];
};

export default function IncidentsPage() {
  const [data, setData] = useState<IncidentsData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const selectedIncident = data?.incidents.find((i) => i.id === selected);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Incident & Failure Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Pattern detection and similar incident analysis
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Recurring Patterns</h2>
          <div className="space-y-3">
            {(data?.patterns ?? []).map((p) => (
              <div key={p.id} className="border rounded-lg p-4 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{p.title}</p>
                  <Badge variant="outline">{p.confidence}%</Badge>
                </div>
                <p className="text-muted-foreground mb-2">{p.description}</p>
                <div className="flex flex-wrap gap-2">
                  {p.assets.map((a) => (
                    <Link key={a} href={`/assets/${a}`} className="text-xs text-primary underline">
                      {a}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Similar Incident Finder</h2>
          {selectedIncident ? (
            <div className="text-sm space-y-2">
              <p className="font-medium">{selectedIncident.summary}</p>
              <p className="text-muted-foreground">{selectedIncident.impact}</p>
              {selectedIncident.rootCause && (
                <p><strong>Root cause:</strong> {selectedIncident.rootCause}</p>
              )}
              <Link href={`/rca?asset=${selectedIncident.asset}`} className="text-primary underline">
                Run RCA on {selectedIncident.asset}
              </Link>
              <button type="button" onClick={() => setSelected(null)} className="block text-xs text-muted-foreground mt-2">
                ← Back to list
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select an incident below to analyze</p>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Incident History</h2>
        <div className="space-y-2">
          {(data?.incidents ?? []).map((inc) => (
            <button
              key={inc.id}
              type="button"
              onClick={() => setSelected(inc.id)}
              className="w-full text-left border rounded-lg p-4 text-sm hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/assets/${inc.asset}`} className="font-mono text-primary" onClick={(e) => e.stopPropagation()}>
                  {inc.asset}
                </Link>
                {inc.date && <span className="text-xs text-muted-foreground">{inc.date}</span>}
              </div>
              <p>{inc.summary}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
