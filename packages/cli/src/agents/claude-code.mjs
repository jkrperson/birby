import { existsSync } from "node:fs";
import { join } from "node:path";
import { commandExists, config, homeDir, hookCommand, readJson, saveConfig, writeJson } from "../lib.mjs";
import { addGroupedHook, hasOurHooks, releaseStatusline, removeGroupedHooks, takeStatusline } from "../settings.mjs";
import { claudeTotals } from "./transcripts.mjs";

const settingsPath = () => join(homeDir(), ".claude", "settings.json");

function loadSettings() {
  const path = settingsPath();
  if (!existsSync(path)) return {};
  const settings = readJson(path, null);
  if (!settings || typeof settings !== "object") {
    throw new Error(`${path} is not valid JSON — fix it (or move it aside) and rerun.`);
  }
  return settings;
}

export const claudeCode = {
  id: "claude-code",
  label: "Claude Code",
  detect: () => existsSync(join(homeDir(), ".claude")) || commandExists("claude"),
  installed: () => hasOurHooks(readJson(settingsPath(), {})),
  supportsStatusline: true,

  install(bin) {
    const settings = loadSettings();
    addGroupedHook(settings, "Stop", hookCommand(bin, "feed", "--agent", "claude-code"), { timeout: 15 });
    writeJson(settingsPath(), settings);
    return ["feeds after every response"];
  },

  uninstall() {
    if (!existsSync(settingsPath())) return;
    const settings = loadSettings();
    removeGroupedHooks(settings);
    this.uninstallStatusline(settings);
    writeJson(settingsPath(), settings);
  },

  installStatusline(bin) {
    const settings = loadSettings();
    const previous = takeStatusline(settings, hookCommand(bin, "statusline"));
    const cfg = config();
    if (previous) cfg.statusline = { wrapped: previous };
    saveConfig(cfg);
    writeJson(settingsPath(), settings);
    return previous ? "pet appended to your existing statusline" : "pet shown in the statusline";
  },

  uninstallStatusline(settings) {
    const own = !settings;
    if (own) settings = loadSettings();
    const cfg = config();
    releaseStatusline(settings, cfg.statusline?.wrapped || null);
    delete cfg.statusline;
    saveConfig(cfg);
    if (own) writeJson(settingsPath(), settings);
  },

  /** Stop hook payload: { session_id, transcript_path, ... } */
  totals(payload) {
    const sessionId = payload.session_id;
    const path = payload.transcript_path;
    if (!sessionId || !path) return null;
    return { sessionId, totals: claudeTotals(path) };
  },
};

