import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_API = "https://birby.me";

export function dataDir() {
  const dir = process.env.CLAUDE_PLUGIN_DATA || join(homedir(), ".birby");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

export function config() {
  return readJson(join(dataDir(), "config.json"), {});
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
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function readStdinJson() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
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
