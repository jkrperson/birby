import { randomBytes } from "node:crypto";
import { and, eq, isNull, lt } from "drizzle-orm";
import { apiTokens, db, deviceCodes } from "@/db";
import { hashToken, mintToken } from "./tokens";

export const DEVICE_CODE_TTL_MS = 10 * 60 * 1000;
export const DEVICE_POLL_INTERVAL_S = 3;

// No 0/O/1/I so the code survives being read aloud or retyped.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function userCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if (i === 3) out += "-";
  }
  return out;
}

export function normalizeUserCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : raw.toUpperCase();
}

export async function startDeviceFlow(hostname: string | null) {
  await db.delete(deviceCodes).where(lt(deviceCodes.expiresAt, new Date()));
  const deviceSecret = "brbd_" + randomBytes(24).toString("base64url");
  const row = {
    id: crypto.randomUUID(),
    userCode: userCode(),
    deviceSecretHash: hashToken(deviceSecret),
    hostname: hostname ? hostname.slice(0, 64) : null,
    expiresAt: new Date(Date.now() + DEVICE_CODE_TTL_MS),
  };
  await db.insert(deviceCodes).values(row);
  return { userCode: row.userCode, deviceSecret, expiresAt: row.expiresAt };
}

export type PendingDevice = { userCode: string; hostname: string | null };

export async function pendingDevice(code: string): Promise<PendingDevice | "expired" | null> {
  const rows = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.userCode, normalizeUserCode(code)));
  const row = rows[0];
  if (!row || row.userId) return null;
  if (row.expiresAt.getTime() < Date.now()) return "expired";
  return { userCode: row.userCode, hostname: row.hostname };
}

export async function approveDevice(
  code: string,
  userId: string,
): Promise<"ok" | "not_found" | "expired"> {
  const rows = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.userCode, normalizeUserCode(code)));
  const row = rows[0];
  if (!row || row.userId) return "not_found";
  if (row.expiresAt.getTime() < Date.now()) return "expired";
  // Claim the row first (guarded on userId still being null) so two
  // concurrent approvals can't both mint a token.
  const claimed = await db
    .update(deviceCodes)
    .set({ userId })
    .where(and(eq(deviceCodes.id, row.id), isNull(deviceCodes.userId)))
    .returning({ id: deviceCodes.id });
  if (!claimed[0]) return "not_found";
  const token = mintToken();
  await db.insert(apiTokens).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashToken(token),
    label: row.hostname ? `claude-code · ${row.hostname}` : "claude-code",
  });
  await db.update(deviceCodes).set({ issuedToken: token }).where(eq(deviceCodes.id, row.id));
  return "ok";
}

export type PollResult =
  | { status: "pending" }
  | { status: "approved"; token: string }
  | { status: "expired" }
  | { status: "not_found" };

export async function pollDevice(deviceSecret: string): Promise<PollResult> {
  const rows = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.deviceSecretHash, hashToken(deviceSecret)));
  const row = rows[0];
  if (!row) return { status: "not_found" };
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(deviceCodes).where(eq(deviceCodes.id, row.id));
    return { status: "expired" };
  }
  if (!row.userId || !row.issuedToken) return { status: "pending" };
  await db.delete(deviceCodes).where(eq(deviceCodes.id, row.id));
  return { status: "approved", token: row.issuedToken };
}
