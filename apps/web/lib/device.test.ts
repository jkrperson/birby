import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api";
import * as schema from "@/db/schema";
import { db } from "@/db";
import {
  approveDevice,
  normalizeUserCode,
  pendingDevice,
  pollDevice,
  startDeviceFlow,
} from "./device";
import { userIdForToken } from "./pet-service";

const USER = "user-1";

beforeAll(async () => {
  const { apply } = await pushSchema(schema, db as never);
  await apply();
  await db.insert(schema.users).values({ id: USER, githubId: 1, username: "tester" });
});

describe("device flow", () => {
  it("links a terminal after browser approval", async () => {
    const { userCode, deviceSecret } = await startDeviceFlow("laptop");
    expect(userCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    expect(await pollDevice(deviceSecret)).toEqual({ status: "pending" });
    expect(await pendingDevice(userCode)).toEqual({ userCode, hostname: "laptop" });
    // The page tolerates lowercase / missing dash.
    expect(await pendingDevice(userCode.toLowerCase().replace("-", ""))).toEqual({
      userCode,
      hostname: "laptop",
    });

    expect(await approveDevice(userCode, USER)).toBe("ok");
    expect(await pendingDevice(userCode)).toBeNull();
    expect(await approveDevice(userCode, USER)).toBe("not_found");

    const polled = await pollDevice(deviceSecret);
    expect(polled.status).toBe("approved");
    const token = polled.status === "approved" ? polled.token : "";
    expect(token.startsWith("brb_")).toBe(true);
    expect(await userIdForToken(token)).toBe(USER);

    // The token is handed over exactly once.
    expect(await pollDevice(deviceSecret)).toEqual({ status: "not_found" });
  });

  it("rejects unknown and expired codes", async () => {
    expect(await pendingDevice("ZZZZ-ZZZZ")).toBeNull();
    expect(await pollDevice("brbd_nope")).toEqual({ status: "not_found" });

    const { userCode, deviceSecret } = await startDeviceFlow(null);
    await db
      .update(schema.deviceCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.deviceCodes.userCode, userCode));
    expect(await pendingDevice(userCode)).toBe("expired");
    expect(await approveDevice(userCode, USER)).toBe("expired");
    expect(await pollDevice(deviceSecret)).toEqual({ status: "expired" });
  });

  it("normalizes user codes", () => {
    expect(normalizeUserCode("abcd2345")).toBe("ABCD-2345");
    expect(normalizeUserCode("abcd-2345")).toBe("ABCD-2345");
    expect(normalizeUserCode("short")).toBe("SHORT");
  });
});
