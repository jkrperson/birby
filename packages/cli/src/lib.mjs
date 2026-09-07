// Shared helpers. Zero dependencies — this file is also copied into
// ~/.birby/cli and run from every agent's hook, so it must stay tiny and safe.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_API = "https://birby.me";

/** Hooks are silent by design; BIRBY_DEBUG=1 makes them explain themselves on stderr. */
export function debug(msg) {
  if (process.env.BIRBY_DEBUG) process.stderr.write(`[birby] ${msg}\n`);
}
export const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

/** Write JSON atomically (tmp + rename) so a hook killed mid-write never
 * leaves a half file behind. */
export function writeJson(path, value) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  renameSync(tmp, path);
}

export const VERSION = readJson(join(PKG_ROOT, "package.json"), {}).version || "0.0.0";

/** Home directory; overridable so tests never touch the real one. */
export function homeDir() {
  return process.env.BIRBY_TEST_HOME || homedir();
}

/** Where birby keeps its state, config, and the installed copy of itself. */
export function dataDir() {
  const dir = process.env.BIRBY_HOME || join(homeDir(), ".birby");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function config() {
  return readJson(join(dataDir(), "config.json"), {});
}

export function saveConfig(cfg) {
  writeJson(join(dataDir(), "config.json"), cfg);
}

export function readState() {
  return readJson(join(dataDir(), "state.json"), { sessions: {}, today: "", todayTokens: 0 });
}

export function saveState(state) {
  writeJson(join(dataDir(), "state.json"), state);
}

export function apiUrl() {
  return process.env.BIRBY_API_URL || config().apiUrl || DEFAULT_API;
}

export async function api(path, { method = "GET", token, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(apiUrl() + path, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
        "user-agent": `birby-cli/${VERSION}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      debug(`${method} ${path} -> ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    debug(`${method} ${path} failed: ${e?.message || e}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Raw stdin, or "" when stdin is a terminal (reading would block forever). */
export function readStdinRaw() {
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export function readStdinJson() {
  try {
    return JSON.parse(readStdinRaw());
  } catch {
    return {};
  }
}

/** Path of the copy of this CLI that hooks point at. */
export function installedDir() {
  return join(dataDir(), "cli");
}

export function installedBin() {
  return join(installedDir(), "bin", "birby.mjs");
}

/** Hook commands we wrote are recognised by this path fragment, so install
 * is idempotent and uninstall only ever removes our own entries. */
export function isOurCommand(command) {
  return typeof command === "string" && /[\\/]\.birby[\\/]cli[\\/]/.test(command);
}

export function hookCommand(bin, ...args) {
  return `node "${bin}" ${args.join(" ")}`;
}

/** True when a binary is on PATH (used only for agent detection). */
export function commandExists(name) {
  const exts = process.platform === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];
  for (const dir of (process.env.PATH || "").split(process.platform === "win32" ? ";" : ":")) {
    if (!dir) continue;
    for (const ext of exts) {
      try {
        readFileSync(join(dir, name + ext));
        return true;
      } catch (e) {
        if (e?.code === "EISDIR") return true;
      }
    }
  }
  return false;
}

const STAGE_EMOJI = {
  egg: "🥚",
  hatchling: "🐣",
  chick: "🐤",
  birby: "🐦",
  megabirby: "🐦‍🔥",
};

export function petLine(pet, todayTokens = 0) {
  const emoji = STAGE_EMOJI[pet.stage] || "🐦";
  const parts = [`${emoji} ${pet.name} · ${pet.mood}`];
  if (pet.streak > 0) parts.push(`🔥${pet.streak}`);
  if (todayTokens > 0) parts.push(`${humanize(todayTokens)} eaten today`);
  return parts.join(" · ");
}

export function humanize(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function todayTokens(state = readState()) {
  return state.today === todayKey() ? state.todayTokens || 0 : 0;
}

/** Sum four-part token totals into one number. */
export function sumTokens(t) {
  return (t.input || 0) + (t.output || 0) + (t.cache_read || 0) + (t.cache_creation || 0);
}

export const EMPTY_TOTALS = Object.freeze({ input: 0, output: 0, cache_read: 0, cache_creation: 0 });
