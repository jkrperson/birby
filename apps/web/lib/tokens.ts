import { createHash, randomBytes } from "crypto";

export function mintToken(): string {
  return "brb_" + randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
