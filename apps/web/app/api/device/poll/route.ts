import { NextRequest, NextResponse } from "next/server";
import { pollDevice } from "@/lib/device";

export async function POST(req: NextRequest) {
  let secret: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.device_secret === "string") secret = body.device_secret;
  } catch {
    // fall through to 400
  }
  if (!secret) {
    return NextResponse.json({ error: "missing device_secret" }, { status: 400 });
  }
  const result = await pollDevice(secret);
  if (result.status === "not_found") {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
