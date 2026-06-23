import neo4j, { Driver } from "neo4j-driver";

const g = global as unknown as { _neo4j?: Driver };

function createDriver(): Driver {
  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "password";

  return neo4j.driver(uri, neo4j.auth.basic(user, password), {
    connectionAcquisitionTimeout: 3_000,
    maxConnectionLifetime: 3 * 60 * 60 * 1_000,
    maxConnectionPoolSize: 50,
  });
}

export const driver: Driver = g._neo4j ?? createDriver();

if (process.env.NODE_ENV !== "production") {
  g._neo4j = driver;
}
