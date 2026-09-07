import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

let _db: Db | null = null;

function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // Neon's serverless driver in production; plain node-postgres or embedded
    // PGlite (DATABASE_URL=pglite://<dir>, dev-only) otherwise. The query APIs
    // are identical for everything we use.
    if (url.startsWith("pglite://")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { drizzle: drizzlePglite } = require("drizzle-orm/pglite");
      _db = drizzlePglite(url.slice("pglite://".length), { schema }) as unknown as Db;
    } else if (url.includes("neon.tech")) {
      _db = drizzleNeon(neon(url), { schema }) as unknown as Db;
    } else {
      _db = drizzlePg(url, { schema });
    }
  }
  return _db;
}

// Lazy so importing this module (e.g. during `next build`) doesn't require a
// live database — connection happens on first query.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export * from "./schema";
