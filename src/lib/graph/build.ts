import { driver } from "@/lib/clients/neo4j";
import type { ChunkWithEntities } from "@/lib/ingest/types";
import { getAssets } from "@/lib/seed";

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");

function unique(arr: string[]): string[] {
  return [...new Set(arr.map(norm).filter(Boolean))];
}

function slug(s: string): string {
  return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

    const rcaChunks = chunks.filter((c) => c.entities.rca);

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

      // RCA / organizational memory chain
      for (const chunk of rcaChunks) {
        const rca = chunk.entities.rca!;
        const incidentId =
          rca.incidentId ??
          `${fileName}-${chunk.metadata.chunkIndex}-${slug(rca.failureMode ?? "event")}`;
        const incidentKey = slug(incidentId);

        await tx.run(
          `MERGE (i:Incident {id: $incidentKey})
           SET i.label = $label, i.eventDate = $eventDate, i.sourceDoc = $fileName`,
          {
            incidentKey,
            label: incidentId,
            eventDate: rca.eventDate ?? null,
            fileName,
          }
        );

        await tx.run(
          `MATCH (d:Document {id: $docId})
           MATCH (i:Incident {id: $incidentKey})
           MERGE (d)-[:DOCUMENTS]->(i)`,
          { docId, incidentKey }
        );

        const assetName = rca.asset
          ? norm(rca.asset)
          : equipment[0] ?? null;
        if (assetName) {
          await tx.run(`MERGE (:Equipment {name: $assetName})`, { assetName });
          await tx.run(
            `MATCH (e:Equipment {name: $assetName})
             MATCH (i:Incident {id: $incidentKey})
             MERGE (e)-[:EXPERIENCED]->(i)`,
            { assetName, incidentKey }
          );
        }

        for (const symptom of rca.symptoms ?? []) {
          const sKey = slug(symptom);
          await tx.run(
            `MERGE (s:Symptom {id: $sKey}) SET s.label = $symptom`,
            { sKey, symptom }
          );
          await tx.run(
            `MATCH (i:Incident {id: $incidentKey})
             MATCH (s:Symptom {id: $sKey})
             MERGE (i)-[:HAS_SYMPTOM]->(s)`,
            { incidentKey, sKey }
          );
        }

        if (rca.rootCause) {
          const rcKey = slug(rca.rootCause).slice(0, 80);
          await tx.run(
            `MERGE (rc:RootCause {id: $rcKey}) SET rc.label = $rootCause`,
            { rcKey, rootCause: rca.rootCause }
          );
          await tx.run(
            `MATCH (i:Incident {id: $incidentKey})
             MATCH (rc:RootCause {id: $rcKey})
             MERGE (i)-[:CAUSED_BY]->(rc)`,
            { incidentKey, rcKey }
          );
        }

        if (rca.resolution) {
          const resKey = slug(rca.resolution).slice(0, 80);
          await tx.run(
            `MERGE (r:Resolution {id: $resKey}) SET r.label = $resolution`,
            { resKey, resolution: rca.resolution }
          );
          await tx.run(
            `MATCH (i:Incident {id: $incidentKey})
             MATCH (r:Resolution {id: $resKey})
             MERGE (i)-[:RESOLVED_BY]->(r)`,
            { incidentKey, resKey }
          );
        }

        if (rca.outcome) {
          const outKey = slug(rca.outcome);
          await tx.run(
            `MERGE (o:Outcome {id: $outKey}) SET o.label = $outcome`,
            { outKey, outcome: rca.outcome }
          );
          await tx.run(
            `MATCH (i:Incident {id: $incidentKey})
             MATCH (o:Outcome {id: $outKey})
             MERGE (i)-[:RESULTED_IN]->(o)`,
            { incidentKey, outKey }
          );
        }

        for (const lesson of rca.lessonsLearned ?? []) {
          const lKey = slug(lesson).slice(0, 80);
          await tx.run(
            `MERGE (l:LessonLearned {id: $lKey}) SET l.label = $lesson`,
            { lKey, lesson }
          );
          await tx.run(
            `MATCH (i:Incident {id: $incidentKey})
             MATCH (l:LessonLearned {id: $lKey})
             MERGE (i)-[:LESSON]->(l)`,
            { incidentKey, lKey }
          );
          await tx.run(
            `MATCH (d:Document {id: $docId})
             MATCH (l:LessonLearned {id: $lKey})
             MERGE (d)-[:CAPTURES]->(l)`,
            { docId, lKey }
          );
        }

        const expert = rca.expertName ?? chunk.entities.personnel[0];
        if (expert) {
          const expertName = norm(expert);
          await tx.run(`MERGE (:Person {name: $expertName})`, { expertName });
          await tx.run(
            `MATCH (p:Person {name: $expertName})
             MATCH (i:Incident {id: $incidentKey})
             MERGE (p)-[:INVESTIGATED]->(i)`,
            { expertName, incidentKey }
          );
          for (const lesson of rca.lessonsLearned ?? []) {
            const lKey = slug(lesson).slice(0, 80);
            await tx.run(
              `MATCH (p:Person {name: $expertName})
               MATCH (l:LessonLearned {id: $lKey})
               MERGE (p)-[:RECOMMENDED]->(l)`,
              { expertName, lKey }
            );
          }
        }
      }
    });

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


export async function mergeSeedAssetMetadata(): Promise<void> {
  const assets = getAssets();
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      for (const asset of assets) {
        const name = asset.tag.toLowerCase();
        await tx.run(
          `MERGE (e:Equipment {name: $name})
           SET e.tag = $tag,
               e.displayName = $displayName,
               e.assetType = $assetType,
               e.plantArea = $plantArea,
               e.manufacturer = $manufacturer,
               e.healthScore = $healthScore,
               e.riskScore = $riskScore,
               e.status = $status,
               e.installationDate = $installationDate,
               e.lastInspection = $lastInspection`,
          {
            name,
            tag: asset.tag,
            displayName: asset.name,
            assetType: asset.type,
            plantArea: asset.plantArea,
            manufacturer: asset.manufacturer,
            healthScore: asset.healthScore,
            riskScore: asset.riskScore,
            status: asset.status,
            installationDate: asset.installationDate,
            lastInspection: asset.lastInspection,
          }
        );
      }
    });
  } finally {
    await session.close();
  }
}

export async function deleteDocumentGraph(fileHash: string): Promise<void> {
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(`MATCH (d:Document {fileHash: $fileHash}) DETACH DELETE d`, {
        fileHash,
      });
      await tx.run(
        `MATCH (e)
         WHERE (e:Equipment OR e:RegulatoryRef OR e:Person OR e:Parameter
                OR e:Symptom OR e:RootCause OR e:Resolution OR e:Outcome OR e:LessonLearned)
           AND NOT ( ()-[]->(e) )
         DETACH DELETE e`
      );
      await tx.run(
        `MATCH (i:Incident)
         WHERE NOT ( ()-[]->(i) )
         DETACH DELETE i`
      );
    });
  } finally {
    await session.close();
  }
}
