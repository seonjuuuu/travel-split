import { defineConfig } from "drizzle-kit";

// Migrations must run against the direct connection, not the pooled one
// (pgbouncer transaction mode doesn't support the session features drizzle-kit needs).
const connectionString = process.env.DIRECT_DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
