import { NextRequest, NextResponse } from "next/server";
import { petForUserId, userIdForToken } from "@/lib/pet-service";

export async function GET(req: NextRequest) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }
  const userId = await userIdForToken(token);
  if (!userId) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  const pet = await petForUserId(userId);
  if (!pet) {
    return NextResponse.json({ error: "no pet" }, { status: 404 });
  }
  return NextResponse.json({ pet });
}
