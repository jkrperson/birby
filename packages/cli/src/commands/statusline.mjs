// Claude Code statusline. Runs on every refresh, so: no network, read the
// cache, and if we wrapped a pre-existing statusline, run it first.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { config, dataDir, petLine, readJson, readStdinRaw, todayTokens } from "../lib.mjs";

const SEP = "\x1b[2m · \x1b[0m";

function runWrapped(wrapped, input) {
  const cmd = wrapped?.command;
  if (typeof cmd !== "string" || !cmd.trim()) return "";
  const shell = process.platform === "win32" ? ["cmd", ["/d", "/s", "/c", cmd]] : ["/bin/sh", ["-c", cmd]];
  try {
    const r = spawnSync(shell[0], shell[1], { input, encoding: "utf8", timeout: 5000 });
    return (r.stdout || "").replace(/\n+$/, "");
  } catch {
    return "";
  }
}

export function statusline() {
  const input = readStdinRaw();
  const base = runWrapped(config().statusline?.wrapped, input);
  const cache = readJson(join(dataDir(), "pet.json"), null);
  const pet = cache?.pet ? petLine(cache.pet, todayTokens()) : "";
  const out = [base, pet].filter(Boolean).join(SEP);
  process.stdout.write(out + "\n");
}
