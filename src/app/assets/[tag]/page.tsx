"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubgraphView } from "@/components/subgraph-view";
import type { SubgraphData } from "@/lib/graph/types";

type AssetDetail = {
  asset: {
    tag: string;
    name: string;
    type: string;
    manufacturer: string;
    plantArea: string;
    installationDate: string;
    status: string;
    healthScore: number;
    riskScore: number;
    lastInspection: string;
  };
  timeline: { date: string; type: string; title: string; description: string; document: string | null }[];
  alerts: { id: string; severity: string; title: string; confidence: number }[];
  similarIncidents: { id: string; summary: string; date?: string }[];
  lessons: { text: string; expertName?: string }[];
  documents: { fileName: string; docType?: string }[];
  aiSummary: string;
};

export default function AssetDetailPage() {
  const params = useParams();
  const tag = String(params.tag ?? "");
  const [data, setData] = useState<AssetDetail | null>(null);
  const [subgraph, setSubgraph] = useState<SubgraphData | null>(null);

  useEffect(() => {
    fetch(`/api/asset/${encodeURIComponent(tag)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [tag]);

  useEffect(() => {
    fetch(`/api/graph?term=${encodeURIComponent(tag)}`)
      .then((r) => r.json())
      .then((d) => setSubgraph(d ?? null))
      .catch(() => setSubgraph(null));
  }, [tag]);

  if (!data?.asset) {
    return (
      <div className="p-6 text-muted-foreground">Loading asset {tag}…</div>
    );
  }

  const { asset } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-mono">{asset.tag}</h1>
            <Badge variant="outline">{asset.status}</Badge>
          </div>
          <p className="text-muted-foreground">{asset.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {asset.plantArea} · {asset.manufacturer} · Installed {asset.installationDate}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">{asset.healthScore}</p>
            <p className="text-xs text-muted-foreground">Health</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{asset.riskScore}</p>
            <p className="text-xs text-muted-foreground">Risk</p>
          </div>
        </div>
      </header>

      <Card className="p-4 text-sm">{data.aiSummary}</Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="graph">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Active Alerts</h3>
            {data.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active alerts</p>
            ) : (
              data.alerts.map((a) => (
                <div key={a.id} className="text-sm py-2 border-b last:border-0">
                  <Badge variant="outline" className="mr-2">{a.severity}</Badge>
                  {a.title}
                </div>
              ))
            )}
          </Card>
          <Link href={`/rca?asset=${asset.tag}`} className="text-sm text-primary hover:underline">
            Run RCA investigation →
          </Link>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-3">
            {data.timeline.map((ev) => (
              <Card key={`${ev.date}-${ev.title}`} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{ev.date}</span>
                  <Badge variant="outline" className="text-[10px]">{ev.type}</Badge>
                </div>
                <p className="font-medium text-sm">{ev.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="mt-4 space-y-3">
          {data.similarIncidents.map((inc) => (
            <Card key={inc.id} className="p-4 text-sm">
              <p className="font-medium">{inc.id}</p>
              <p className="text-muted-foreground mt-1">{inc.summary}</p>
              {inc.date && <p className="text-xs mt-1">{inc.date}</p>}
            </Card>
          ))}
          {data.lessons.map((l, i) => (
            <Card key={i} className="p-4 text-sm border-l-2 border-primary">
              <p>{l.text}</p>
              {l.expertName && <p className="text-xs text-muted-foreground mt-1">— {l.expertName}</p>}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-2">
            {data.documents.map((doc) => (
              <Card key={doc.fileName} className="p-3 text-sm">
                <p className="font-medium truncate">{doc.fileName}</p>
                {doc.docType && (
                  <Badge variant="outline" className="mt-1 text-[10px]">{doc.docType}</Badge>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="graph" className="mt-4">
          {subgraph && subgraph.nodes.length > 0 ? (
            <>
              <SubgraphView data={subgraph} height={360} />
              <Link href={`/graph?term=${asset.tag}`} className="text-sm text-primary mt-2 inline-block">
                Open full graph →
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No graph data for this asset yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
