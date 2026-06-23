import { driver } from "@/lib/clients/neo4j";
import type { ChunkWithEntities } from "@/lib/ingest/types";

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");

function unique(arr: string[]): string[] {
  return [...new Set(arr.map(norm).filter(Boolean))];
}

export async function buildDocumentGraph(
  chunks: ChunkWithEntities[],
  fileName: string,
  fileHash: string,
  docId: string
): Promise<void> {
  const session = driver.session();
  try {
    const docType = chunks[0]?.entities.docType ?? "other";

    const equipment = unique(chunks.flatMap((c) => c.entities.equipmentTags));
    const refs = unique(chunks.flatMap((c) => c.entities.regulatoryRefs));
    const personnel = unique(chunks.flatMap((c) => c.entities.personnel));
    const params = unique(chunks.flatMap((c) => c.entities.processParameters));

    const governedPairs = chunks
      .flatMap((c) =>
        c.entities.equipmentTags.flatMap((eq) =>
          c.entities.regulatoryRefs.map((ref) => ({
            equipment: norm(eq),
            ref: norm(ref),
          }))
        )
      )
      .filter((p) => p.equipment && p.ref);

    await session.executeWrite(async (tx) => {
      await tx.run(
        `MERGE (d:Document {id: $docId})
         SET d.fileName = $fileName, d.fileHash = $fileHash, d.docType = $docType`,
        { docId, fileName, fileHash, docType }
      );

      if (equipment.length > 0) {
        await tx.run(`UNWIND $names AS name MERGE (:Equipment {name: name})`, {
          names: equipment,
        });
        await tx.run(
          `MATCH (d:Document {id: $docId})
           UNWIND $names AS name
           MATCH (e:Equipment {name: name})
           MERGE (d)-[:MENTIONS]->(e)`,
          { docId, names: equipment }
        );
      }

      if (refs.length > 0) {
        await tx.run(
          `UNWIND $names AS name MERGE (:RegulatoryRef {name: name})`,
          { names: refs }
        );
        await tx.run(
          `MATCH (d:Document {id: $docId})
           UNWIND $names AS name
           MATCH (r:RegulatoryRef {name: name})
           MERGE (d)-[:MENTIONS]->(r)`,
          { docId, names: refs }
        );
      }

      if (personnel.length > 0) {
        await tx.run(`UNWIND $names AS name MERGE (:Person {name: name})`, {
          names: personnel,
        });
        await tx.run(
          `MATCH (d:Document {id: $docId})
           UNWIND $names AS name
           MATCH (p:Person {name: name})
           MERGE (d)-[:MENTIONS]->(p)`,
          { docId, names: personnel }
        );
      }

      if (params.length > 0) {
        await tx.run(
          `UNWIND $names AS name MERGE (:Parameter {name: name})`,
          { names: params }
        );
        await tx.run(
          `MATCH (d:Document {id: $docId})
           UNWIND $names AS name
           MATCH (param:Parameter {name: name})
           MERGE (d)-[:MENTIONS]->(param)`,
          { docId, names: params }
        );
      }

      if (governedPairs.length > 0) {
        await tx.run(
          `UNWIND $pairs AS pair
           MATCH (e:Equipment {name: pair.equipment})
           MATCH (r:RegulatoryRef {name: pair.ref})
           MERGE (e)-[:GOVERNED_BY]->(r)`,
          { pairs: governedPairs }
        );
      }
    });

    // Cross-document RELATES_TO (shared entity nodes)
    await session.run(
      `MATCH (d1:Document {id: $docId})-[:MENTIONS]->(shared)<-[:MENTIONS]-(d2:Document)
       WHERE d2.id <> $docId
       MERGE (d1)-[:RELATES_TO]->(d2)`,
      { docId }
    );
  } finally {
    await session.close();
  }
}
