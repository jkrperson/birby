import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { commandExists, homeDir, hookCommand, readJson, writeJson } from "../lib.mjs";
import { addGroupedHook, ensureTomlFeature, hasOurHooks, removeGroupedHooks } from "../settings.mjs";
import { codexTotals } from "./transcripts.mjs";

const codexDir = () => join(homeDir(), ".codex");
const hooksPath = () => join(codexDir(), "hooks.json");
const configPath = () => join(codexDir(), "config.toml");

function loadHooks() {
  const path = hooksPath();
  if (!existsSync(path)) return {};
  const settings = readJson(path, null);
  if (!settings || typeof settings !== "object") {
    throw new Error(`${path} is not valid JSON — fix it (or move it aside) and rerun.`);
  }
  return settings;
}

/** Session id is in the rollout filename: rollout-<date>-<session id>.jsonl */
function findRollout(root, sessionId, depth = 0) {
  let entries;
  try {
    entries = readdirSync(root);
  } catch {
    return null;
  }
  for (const name of entries) {
    const full = join(root, name);
    if (name.endsWith(`${sessionId}.jsonl`)) return full;
    if (depth < 4) {
      try {
        if (statSync(full).isDirectory()) {
          const hit = findRollout(full, sessionId, depth + 1);
          if (hit) return hit;
        }
      } catch {
        // unreadable — skip
      }
    }
  }
  return null;
}

export const codex = {
  id: "codex",
  label: "Codex",
  detect: () => existsSync(codexDir()) || commandExists("codex"),
  installed: () => hasOurHooks(readJson(hooksPath(), {})),

  install(bin) {
    const settings = loadHooks();
    addGroupedHook(settings, "Stop", hookCommand(bin, "feed", "--agent", "codex"), { timeout: 15 });
    writeJson(hooksPath(), settings);
    const notes = ["feeds after every turn"];
    // Codex keeps hooks behind a feature flag.
    const path = configPath();
    const text = existsSync(path) ? readFileSync(path, "utf8") : "";
    const next = ensureTomlFeature(text, "hooks");
    if (next !== text) {
      writeFileSync(path, next);
      notes.push("enabled hooks in ~/.codex/config.toml");
    }
    return notes;
  },

  uninstall() {
    if (!existsSync(hooksPath())) return;
    const settings = loadHooks();
    removeGroupedHooks(settings);
    writeJson(hooksPath(), settings);
  },

  totals(payload) {
    const sessionId = payload.session_id || payload.thread_id;
    if (!sessionId) return null;
    const path = payload.transcript_path || findRollout(join(codexDir(), "sessions"), sessionId);
    if (!path) return null;
    return { sessionId, totals: codexTotals(path) };
  },
};
