import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't load Next's env files, so pick up .env.local / .env here.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // older Node without loadEnvFile: fall back to the shell environment
    }
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local first");
}
const pglite = url.startsWith("pglite://");

export default defineConfig({
  schema: "./db/schema.ts",
  dialect: "postgresql",
  ...(pglite ? { driver: "pglite" } : {}),
  dbCredentials: {
    url: pglite ? url.slice("pglite://".length) : url,
  },
});
