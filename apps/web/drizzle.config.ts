import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL!;
const pglite = url?.startsWith("pglite://");

export default defineConfig({
  schema: "./db/schema.ts",
  dialect: "postgresql",
  ...(pglite ? { driver: "pglite" } : {}),
  dbCredentials: {
    url: pglite ? url.slice("pglite://".length) : url,
  },
});
