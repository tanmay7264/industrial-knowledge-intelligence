import { retrieveNeighborhood } from "@/lib/graph/retrieve";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term")?.trim();

  if (!term) {
    return Response.json({ error: "term is required" }, { status: 400 });
  }

  try {
    const subgraph = await retrieveNeighborhood(term);
    return Response.json(subgraph);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Graph query failed" },
      { status: 500 }
    );
  }
}
