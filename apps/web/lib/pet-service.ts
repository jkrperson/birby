import { eq } from "drizzle-orm";
import { applyFeed, petState, type PetRow, type PetState, type TokenDelta } from "@birby/core";
import { apiTokens, db, feedings, pets, users } from "@/db";
import { hashToken } from "./tokens";

type DbPet = typeof pets.$inferSelect;

function toRow(pet: DbPet): PetRow {
  return {
    name: pet.name,
    lifetimeTokens: pet.lifetimeTokens,
    fullness: pet.fullness,
    lastFedAt: pet.lastFedAt ? pet.lastFedAt.getTime() : null,
    streakCount: pet.streakCount,
    streakDay: pet.streakDay,
    streakFreezes: pet.streakFreezes,
  };
}

export async function petForUserId(userId: string): Promise<PetState | null> {
  const rows = await db.select().from(pets).where(eq(pets.userId, userId));
  return rows[0] ? petState(toRow(rows[0]), Date.now()) : null;
}

export async function petForUsername(
  username: string,
): Promise<{ pet: PetState; avatarUrl: string | null } | null> {
  const rows = await db
    .select({ pet: pets, avatarUrl: users.avatarUrl })
    .from(users)
    .innerJoin(pets, eq(pets.userId, users.id))
    .where(eq(users.username, username));
  if (!rows[0]) return null;
  return { pet: petState(toRow(rows[0].pet), Date.now()), avatarUrl: rows[0].avatarUrl };
}

export async function userIdForToken(token: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hashToken(token)));
  if (!rows[0]) return null;
  await db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, rows[0].id));
  return rows[0].userId;
}

export async function feedPet(
  userId: string,
  delta: TokenDelta,
  sessionId: string | null,
  agent: string,
): Promise<PetState | null> {
  const rows = await db.select().from(pets).where(eq(pets.userId, userId));
  const pet = rows[0];
  if (!pet) return null;
  const now = Date.now();
  const updated = applyFeed(toRow(pet), delta, now);
  await db
    .update(pets)
    .set({
      lifetimeTokens: updated.lifetimeTokens,
      fullness: updated.fullness,
      lastFedAt: new Date(now),
      streakCount: updated.streakCount,
      streakDay: updated.streakDay,
      streakFreezes: updated.streakFreezes,
    })
    .where(eq(pets.id, pet.id));
  await db.insert(feedings).values({
    id: crypto.randomUUID(),
    petId: pet.id,
    inputTokens: delta.input,
    outputTokens: delta.output,
    cacheReadTokens: delta.cacheRead,
    cacheCreationTokens: delta.cacheCreation,
    sessionId,
    agent,
  });
  return petState(updated, now);
}
