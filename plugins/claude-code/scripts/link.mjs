#!/usr/bin/env node
// Connect this machine to a birby.me pet.
//
//   node link.mjs                 device flow: opens the browser, waits for approval
//   node link.mjs <brb_token>     manual: save a connect token minted on the site
//   node link.mjs ... [apiUrl]    optional API override for self-hosting
import { spawn } from "node:child_process";
import { hostname } from "node:os";
import { join } from "node:path";
import { api, apiUrl, config, dataDir, petLine, readJson, writeJson } from "./lib.mjs";

// Claude Code's Bash tool times out at 2 minutes by default, so one run polls
// for well under that and the skill re-runs us if approval is still pending.
const POLL_BUDGET_MS = Number(process.env.BIRBY_POLL_BUDGET_MS) || 80_000;

const args = process.argv.slice(2);
const token = args.find((a) => a.startsWith("brb_"));
const apiOverride = args.find((a) => /^https?:\/\//.test(a));

const configPath = join(dataDir(), "config.json");
const cfg = config();
if (apiOverride) {
  cfg.apiUrl = apiOverride;
  writeJson(configPath, cfg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function openBrowser(url) {
  const cmd =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  } catch {
    // Printing the URL is the fallback.
  }
}

async function finish(connectToken) {
  cfg.token = connectToken;
  delete cfg.pending;
  writeJson(configPath, cfg);
  const result = await api("/api/pet", { token: connectToken });
  if (!result?.pet) {
    console.log(
      "Token saved, but the birby API rejected it or was unreachable. " +
        "Run /birby:link again to retry.",
    );
    process.exit(1);
  }
  writeJson(join(dataDir(), "pet.json"), { pet: result.pet, updatedAt: Date.now() });
  console.log(`Linked! ${petLine(result.pet)}`);
  console.log("Your birby now eats the tokens from every session automatically.");
}

async function deviceFlow() {
  let pending = cfg.pending;
  const fresh = !pending || !pending.deviceSecret || Date.now() > (pending.expiresAt || 0);
  if (fresh) {
    const started = await api("/api/device/start", {
      method: "POST",
      body: { hostname: hostname() },
    });
    if (!started?.device_secret) {
      console.log(`Couldn't reach ${apiUrl()} to start linking. Check your connection and try again.`);
      process.exit(1);
    }
    pending = {
      deviceSecret: started.device_secret,
      userCode: started.user_code,
      verifyUrl: started.verify_url,
      interval: started.interval || 3,
      expiresAt: Date.now() + (started.expires_in || 600) * 1000,
    };
    cfg.pending = pending;
    writeJson(configPath, cfg);
    openBrowser(pending.verifyUrl);
  }

  console.log(`Open this link to hatch your birby:\n\n  ${pending.verifyUrl}\n`);
  console.log(`Code: ${pending.userCode}  (sign in with GitHub, then click Approve)`);
  console.log("Waiting for approval…");

  const deadline = Date.now() + POLL_BUDGET_MS;
  while (Date.now() < deadline) {
    await sleep(pending.interval * 1000);
    const res = await api("/api/device/poll", {
      method: "POST",
      body: { device_secret: pending.deviceSecret },
    });
    if (res?.status === "approved" && res.token) {
      await finish(res.token);
      return;
    }
    if (res?.status === "expired" || res?.status === "not_found") {
      delete cfg.pending;
      writeJson(configPath, cfg);
      console.log("That link expired. Run /birby:link again for a fresh one.");
      process.exit(1);
    }
  }
  console.log("STILL_WAITING: not approved yet. Run /birby:link again after clicking Approve.");
  process.exit(2);
}

if (token) {
  await finish(token);
} else {
  await deviceFlow();
}
