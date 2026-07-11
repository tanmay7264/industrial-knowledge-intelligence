# Production deployment — quick signup guide

**Live URL (Vercel):** https://industrial-knowledge-intelligence-eight.vercel.app

Railway trial expired; app is deployed on Vercel. Redis, Groq, and Jina are configured.
**Still needed:** Qdrant Cloud + Neo4j Aura credentials (then run seed).

## 1. Qdrant Cloud (free, ~2 min)

1. Go to https://cloud.qdrant.io → Sign up (GitHub is fine)
2. **Create cluster** → choose **Free** tier → AWS → pick a region
3. After provisioning, open the cluster → copy:
   - **Cluster URL** (HTTPS, e.g. `https://xxxx.cloud.qdrant.io`)
   - **API key** (create one under API Keys)

## 2. Neo4j Aura (free, ~2 min)

1. Go to https://neo4j.com/cloud/aura/ → **Start free**
2. Create **AuraDB Free** instance
3. Save the credentials shown once:
   - **URI** (`neo4j+s://xxxx.databases.neo4j.io`)
   - **Username** (`neo4j`)
   - **Password**

## 3. Add to Vercel (agent or you)

Paste these in [Vercel project env vars](https://vercel.com/tanmay7264s-projects/industrial-knowledge-intelligence/settings/environment-variables) for **Production**:

```
QDRANT_URL=https://YOUR-CLUSTER.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
NEO4J_URI=neo4j+s://YOUR-INSTANCE.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password
```

Then redeploy: `vercel deploy --prod --yes`

## 4. Seed production corpus (from your laptop)

```bash
cp .env.production.example .env.production.local
# Fill in all values (same as Vercel Production env)
npm run seed
```

Takes ~10–30 minutes for all sample docs.

## 5. Verify

```bash
curl https://industrial-knowledge-intelligence-eight.vercel.app/api/health
# Expect: qdrant, neo4j, redis all "ok"

IKI_BASE_URL=https://industrial-knowledge-intelligence-eight.vercel.app npx tsx scripts/e2e-test.ts
```

## Already configured on Vercel

- `GROQ_API_KEY`
- `JINA_API_KEY`
- `LLM_PROVIDER=groq`
- `REDIS_URL` (Upstash from existing project)
