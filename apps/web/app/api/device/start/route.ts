import { NextRequest, NextResponse } from "next/server";
import { DEVICE_CODE_TTL_MS, DEVICE_POLL_INTERVAL_S, startDeviceFlow } from "@/lib/device";

export async function POST(req: NextRequest) {
  let hostname: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.hostname === "string") hostname = body.hostname;
  } catch {
    // body is optional
  }
  const { userCode, deviceSecret } = await startDeviceFlow(hostname);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://birby.me";
  return NextResponse.json({
    user_code: userCode,
    device_secret: deviceSecret,
    verify_url: `${base}/link?code=${userCode}`,
    expires_in: Math.floor(DEVICE_CODE_TTL_MS / 1000),
    interval: DEVICE_POLL_INTERVAL_S,
  });
}
