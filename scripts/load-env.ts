import { existsSync } from "fs";

// Next.js loads .env.local automatically, but standalone tsx scripts do not.
// Import this module first so credentials are available before any client or
// provider module reads process.env.
for (const envFile of [".env.production.local", ".env.local", ".env"]) {
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
    break;
  }
}
