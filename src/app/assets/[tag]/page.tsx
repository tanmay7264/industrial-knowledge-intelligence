"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity, AlertTriangle, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubgraphView } from "@/components/subgraph-view";
import {
  PageShell,
  HeroBand,
  HeroMetricCard,
  ContentCard,
} from "@/components/page-shell";
import { SEVERITY_STYLES } from "@/lib/ui/status-styles";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";
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
  timeline: {
    date: string;
    type: string;
    title: string;
    description: string;
    document: string | null;
  }[];
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
      <PageShell title={`Asset ${tag}`} subtitle="Loading asset profile…">
        <p className="text-muted-foreground text-sm">Fetching asset data…</p>
      </PageShell>
    );
  }

  const { asset } = data;

  return (
    <PageShell
      title={
        <span className="font-mono">
          {asset.tag}
          <Badge variant="outline" className="ml-3 align-middle text-xs">
            {asset.status}
          </Badge>
        </span>
      }
      subtitle={`${asset.name} · ${asset.plantArea} · ${asset.manufacturer} · Installed ${asset.installationDate}`}
      hero={
        <HeroBand>
          <HeroMetricCard
            label="Health Score"
            value={asset.healthScore}
            icon={Heart}
            trend={5}
            sparklineData={sparklineFromSeed(asset.healthScore)}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="Risk Score"
            value={asset.riskScore}
            icon={AlertTriangle}
            trend={-8}
            sparklineData={sparklineFromSeed(asset.riskScore + 50)}
            sparklineColor="#ef4444"
          />
          <HeroMetricCard
            label="Active Alerts"
            value={data.alerts.length}
            icon={Activity}
            trendLabel={`Last inspection ${asset.lastInspection}`}
            sparklineData={sparklineFromSeed(data.alerts.length + 300)}
          />
        </HeroBand>
      }
    >
      <ContentCard>
        <p className="text-sm leading-relaxed">{data.aiSummary}</p>
      </ContentCard>

      <Tabs defaultValue="overview">
        <div className="-mx-1 overflow-x-auto no-scrollbar">
          <TabsList className="w-max min-w-full sm:w-fit">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="graph">Relationships</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <ContentCard title="Active Alerts">
            {data.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active alerts</p>
            ) : (
              data.alerts.map((a) => (
                <div
                  key={a.id}
                  className="text-sm py-2 border-b border-border last:border-0"
                >
                  <Badge
                    variant="outline"
                    className={`mr-2 ${SEVERITY_STYLES[a.severity] ?? ""}`}
                  >
                    {a.severity}
                  </Badge>
                  {a.title}
                </div>
              ))
            )}
          </ContentCard>
          <Link
            href={`/rca?asset=${asset.tag}`}
            className="text-sm text-primary hover:underline"
          >
            Run RCA investigation →
          </Link>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-3">
          {data.timeline.map((ev) => (
            <ContentCard key={`${ev.date}-${ev.title}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">{ev.date}</span>
                <Badge variant="outline" className="text-[10px]">
                  {ev.type}
                </Badge>
              </div>
              <p className="font-medium text-sm">{ev.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {ev.description}
              </p>
            </ContentCard>
          ))}
        </TabsContent>

        <TabsContent value="incidents" className="mt-4 space-y-3">
          {data.similarIncidents.map((inc) => (
            <ContentCard key={inc.id}>
              <p className="font-medium text-sm">{inc.id}</p>
              <p className="text-muted-foreground mt-1 text-sm">{inc.summary}</p>
              {inc.date && (
                <p className="text-xs mt-1 text-muted-foreground">{inc.date}</p>
              )}
            </ContentCard>
          ))}
          {data.lessons.map((l, i) => (
            <ContentCard key={i} className="border-l-2 border-l-primary">
              <p className="text-sm">{l.text}</p>
              {l.expertName && (
                <p className="text-xs text-muted-foreground mt-1">
                  — {l.expertName}
                </p>
              )}
            </ContentCard>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {data.documents.map((doc) => (
              <ContentCard key={doc.fileName} className="p-3">
                <p className="font-medium truncate text-sm">{doc.fileName}</p>
                {doc.docType && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {doc.docType}
                  </Badge>
                )}
              </ContentCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="graph" className="mt-4">
          {subgraph?.nodes && subgraph.nodes.length > 0 ? (
            <>
              <ContentCard className="p-2">
                <SubgraphView data={subgraph} height={360} />
              </ContentCard>
              <Link
                href={`/graph?term=${asset.tag}`}
                className="text-sm text-primary mt-2 inline-block"
              >
                Open full graph →
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No graph data for this asset yet.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
