import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { commandExists, homeDir, hookCommand, readJson, writeJson } from "../lib.mjs";
import { addGroupedHook, hasOurHooks, removeGroupedHooks } from "../settings.mjs";
import { geminiTotals } from "./transcripts.mjs";

const geminiDir = () => join(homeDir(), ".gemini");
const settingsPath = () => join(geminiDir(), "settings.json");

function loadSettings() {
  const path = settingsPath();
  if (!existsSync(path)) return {};
  const settings = readJson(path, null);
  if (!settings || typeof settings !== "object") {
    throw new Error(`${path} is not valid JSON — fix it (or move it aside) and rerun.`);
  }
  return settings;
}

/** Chats live at ~/.gemini/tmp/<project hash>/chats/session-*.json and name
 * their session inside; scan for the one we want. */
function findChat(sessionId) {
  const tmp = join(geminiDir(), "tmp");
  let projects;
  try {
    projects = readdirSync(tmp);
  } catch {
    return null;
  }
  const needle = `"sessionId": "${sessionId}"`;
  for (const p of projects) {
    const chats = join(tmp, p, "chats");
    let files;
    try {
      files = readdirSync(chats);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const full = join(chats, f);
      try {
        if (readFileSync(full, "utf8").includes(needle)) return full;
      } catch {
        // skip
      }
    }
  }
  return null;
}

export const gemini = {
  id: "gemini",
  label: "Gemini CLI",
  detect: () => existsSync(geminiDir()) || commandExists("gemini"),
  installed: () => hasOurHooks(readJson(settingsPath(), {})),
  // Gemini blocks until a hook prints JSON, so feed always answers with {}.
  hookStdout: "{}",

  install(bin) {
    const settings = loadSettings();
    addGroupedHook(settings, "AfterAgent", hookCommand(bin, "feed", "--agent", "gemini"));
    writeJson(settingsPath(), settings);
    return ["feeds after every response"];
  },

  uninstall() {
    if (!existsSync(settingsPath())) return;
    const settings = loadSettings();
    removeGroupedHooks(settings);
    writeJson(settingsPath(), settings);
  },

  totals(payload) {
    const sessionId = payload.session_id;
    if (!sessionId) return null;
    const path = payload.transcript_path || findChat(sessionId);
    if (!path) return null;
    return { sessionId, totals: geminiTotals(path) };
  },
};
