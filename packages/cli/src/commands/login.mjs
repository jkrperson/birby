// Device flow: print a URL + code, open the browser, poll until approved.
import { spawn } from "node:child_process";
import { hostname } from "node:os";
import { join } from "node:path";
import { api, apiUrl, config, dataDir, petLine, saveConfig, writeJson } from "../lib.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    // the printed URL is the fallback
  }
}

async function finish(cfg, token) {
  cfg.token = token;
  delete cfg.pending;
  saveConfig(cfg);
  const result = await api("/api/pet", { token });
  if (!result?.pet) {
    console.log(`Token saved, but ${apiUrl()} rejected it or was unreachable. Run \`birby login\` to retry.`);
    return false;
  }
  writeJson(join(dataDir(), "pet.json"), { pet: result.pet, updatedAt: Date.now() });
  console.log(`Linked! ${petLine(result.pet)}`);
  return true;
}

/**
 * @param {object} opts
 * @param {string=} opts.token   a brb_ connect token minted on the site
 * @param {string=} opts.apiUrl  self-hosted API
 * @param {boolean=} opts.interactive  keep polling until the code expires
 *   (a TTY); otherwise poll briefly and exit 2 with STILL_WAITING so an agent
 *   driving us can rerun.
 */
export async function login({ token, apiUrl: override, interactive = !!process.stdout.isTTY } = {}) {
  const cfg = config();
  if (override) {
    cfg.apiUrl = override;
    saveConfig(cfg);
  }
  if (token) return finish(cfg, token);

  let pending = cfg.pending;
  const stale = !pending?.deviceSecret || Date.now() > (pending.expiresAt || 0);
  if (stale) {
    const started = await api("/api/device/start", { method: "POST", body: { hostname: hostname() } });
    if (!started?.device_secret) {
      console.log(`Couldn't reach ${apiUrl()} to start linking. Check your connection and try again.`);
      return false;
    }
    pending = {
      deviceSecret: started.device_secret,
      userCode: started.user_code,
      verifyUrl: started.verify_url,
      interval: started.interval || 3,
      expiresAt: Date.now() + (started.expires_in || 600) * 1000,
    };
    cfg.pending = pending;
    saveConfig(cfg);
    openBrowser(pending.verifyUrl);
  }

  console.log(`Open this link to hatch your birby:\n\n  ${pending.verifyUrl}\n`);
  console.log(`Code: ${pending.userCode}  (sign in with GitHub, then click Approve)`);
  console.log("Waiting for approval…");

  const budget = Number(process.env.BIRBY_POLL_BUDGET_MS) || 80_000;
  const deadline = interactive ? pending.expiresAt : Date.now() + budget;
  while (Date.now() < deadline) {
    await sleep(pending.interval * 1000);
    const res = await api("/api/device/poll", { method: "POST", body: { device_secret: pending.deviceSecret } });
    if (res?.status === "approved" && res.token) return finish(cfg, res.token);
    if (res?.status === "expired" || res?.status === "not_found") {
      delete cfg.pending;
      saveConfig(cfg);
      console.log("That link expired. Run `birby login` again for a fresh one.");
      return false;
    }
  }
  if (interactive) {
    delete cfg.pending;
    saveConfig(cfg);
    console.log("That link expired. Run `birby login` again for a fresh one.");
    return false;
  }
  console.log("STILL_WAITING: not approved yet. Click Approve in the browser, then run the same command again.");
  process.exitCode = 2;
  return false;
}

export function logout() {
  const cfg = config();
  if (!cfg.token) {
    console.log("No birby linked on this machine.");
    return;
  }
  delete cfg.token;
  delete cfg.pending;
  saveConfig(cfg);
  console.log("Unlinked. Hooks stay installed and go quiet; `birby login` links again, `birby uninstall` removes them.");
}
