// Hooks must point at a stable path that survives `npx` cache churn, so the
// CLI copies itself into ~/.birby/cli. `birby update` refreshes that copy.
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { join } from "node:path";
import { PKG_ROOT, installedBin, installedDir } from "./lib.mjs";

const FILES = ["package.json", "bin", "src"];

export function copyPackage(from, to) {
  const tmp = `${to}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  for (const entry of FILES) cpSync(join(from, entry), join(tmp, entry), { recursive: true });
  rmSync(to, { recursive: true, force: true });
  renameSync(tmp, to);
}

export function runningFromInstall() {
  return resolve(PKG_ROOT) === resolve(installedDir());
}

/** Make sure ~/.birby/cli holds this version. Returns the bin path. */
export function installSelf() {
  if (!runningFromInstall()) copyPackage(PKG_ROOT, installedDir());
  if (!existsSync(installedBin())) throw new Error("self-install failed: bin missing");
  return installedBin();
}
