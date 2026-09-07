import { NextRequest, NextResponse } from "next/server";
import type { TokenDelta } from "@birby/core";
import { feedPet, userIdForToken } from "@/lib/pet-service";

const MAX_TOKENS_PER_FEED = 50_000_000;

function sanitize(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(Math.floor(v), MAX_TOKENS_PER_FEED);
}

export async function POST(req: NextRequest) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }
  const userId = await userIdForToken(token);
  if (!userId) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const t = (body.tokens ?? {}) as Record<string, unknown>;
  const delta: TokenDelta = {
    input: sanitize(t.input),
    output: sanitize(t.output),
    cacheRead: sanitize(t.cache_read),
    cacheCreation: sanitize(t.cache_creation),
  };
  const total = delta.input + delta.output + delta.cacheRead + delta.cacheCreation;
  if (total <= 0) {
    return NextResponse.json({ error: "nothing to feed" }, { status: 400 });
  }

  const pet = await feedPet(
    userId,
    delta,
    typeof body.session_id === "string" ? body.session_id.slice(0, 128) : null,
    typeof body.agent === "string" ? body.agent.slice(0, 64) : "claude-code",
  );
  if (!pet) {
    return NextResponse.json({ error: "no pet" }, { status: 404 });
  }
  return NextResponse.json({ pet, ate: total });
}
