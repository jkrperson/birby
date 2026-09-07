// Refresh ~/.birby/cli from npm. Called by `birby update` and, once a day,
// in the background after a feed.
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { VERSION, dataDir, installedDir, readJson } from "../lib.mjs";
import { copyPackage } from "../self-install.mjs";

function isNewer(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

export function update({ quiet = false } = {}) {
  const tmp = join(dataDir(), "update-tmp");
  rmSync(tmp, { recursive: true, force: true });
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(
    npm,
    ["install", "--prefix", tmp, "--no-audit", "--no-fund", "--no-package-lock", "--silent", "birby@latest"],
    { stdio: "ignore", timeout: 120_000, shell: process.platform === "win32" },
  );
  const src = join(tmp, "node_modules", "birby");
  if (r.status !== 0 || !existsSync(join(src, "package.json"))) {
    rmSync(tmp, { recursive: true, force: true });
    if (!quiet) console.log("Couldn't fetch the latest birby from npm. Try again later.");
    return false;
  }
  const next = readJson(join(src, "package.json"), {}).version;
  const current = readJson(join(installedDir(), "package.json"), {}).version || VERSION;
  if (!next || !isNewer(next, current)) {
    rmSync(tmp, { recursive: true, force: true });
    if (!quiet) console.log(`birby ${current} is up to date.`);
    return false;
  }
  copyPackage(src, installedDir());
  rmSync(tmp, { recursive: true, force: true });
  if (!quiet) console.log(`Updated birby ${current} → ${next}. Hooks pick it up on their next run.`);
  return true;
}
