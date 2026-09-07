import {
  bigint,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    githubId: bigint("github_id", { mode: "number" }).notNull(),
    username: text("username").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_github_id_idx").on(t.githubId),
    uniqueIndex("users_username_idx").on(t.username),
  ],
);

export const pets = pgTable(
  "pets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull().default("Birby"),
    lifetimeTokens: bigint("lifetime_tokens", { mode: "number" }).notNull().default(0),
    fullness: real("fullness").notNull().default(0),
    lastFedAt: timestamp("last_fed_at"),
    streakCount: integer("streak_count").notNull().default(0),
    streakDay: text("streak_day"),
    streakFreezes: integer("streak_freezes").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pets_user_id_idx").on(t.userId)],
);

export const feedings = pgTable(
  "feedings",
  {
    id: text("id").primaryKey(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).notNull().default(0),
    cacheCreationTokens: bigint("cache_creation_tokens", { mode: "number" }).notNull().default(0),
    sessionId: text("session_id"),
    agent: text("agent").notNull().default("claude-code"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("feedings_pet_created_idx").on(t.petId, t.createdAt)],
);

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    label: text("label").notNull().default("claude-code"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("api_tokens_hash_idx").on(t.tokenHash)],
);

// OAuth-style device flow for `/birby:link`: the terminal creates a row, the
// user approves it in the browser, and the terminal polls until a token is
// issued. Rows are short-lived; the issued token is stored in plaintext only
// until the terminal collects it (which deletes the row).
export const deviceCodes = pgTable(
  "device_codes",
  {
    id: text("id").primaryKey(),
    userCode: text("user_code").notNull(),
    deviceSecretHash: text("device_secret_hash").notNull(),
    hostname: text("hostname"),
    userId: text("user_id").references(() => users.id),
    issuedToken: text("issued_token"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("device_codes_user_code_idx").on(t.userCode),
    uniqueIndex("device_codes_secret_idx").on(t.deviceSecretHash),
  ],
);
