import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { commandExists, homeDir, hookCommand, readJson, writeJson } from "../lib.mjs";
import { addFlatHook, hasOurHooks, removeFlatHooks } from "../settings.mjs";
import { cursorTotals } from "./transcripts.mjs";

const cursorDir = () => join(homeDir(), ".cursor");
const hooksPath = () => join(cursorDir(), "hooks.json");

function loadHooks() {
  const path = hooksPath();
  if (!existsSync(path)) return { version: 1, hooks: {} };
  const settings = readJson(path, null);
  if (!settings || typeof settings !== "object") {
    throw new Error(`${path} is not valid JSON — fix it (or move it aside) and rerun.`);
  }
  return settings;
}

/** ~/.cursor/projects/<slug>/agent-transcripts/<id>/<id>.jsonl */
function findTranscript(id) {
  const projects = join(cursorDir(), "projects");
  let slugs;
  try {
    slugs = readdirSync(projects);
  } catch {
    return null;
  }
  for (const slug of slugs) {
    const candidate = join(projects, slug, "agent-transcripts", id, `${id}.jsonl`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export const cursor = {
  id: "cursor",
  label: "Cursor",
  detect: () => existsSync(cursorDir()) || commandExists("cursor-agent"),
  installed: () => hasOurHooks(readJson(hooksPath(), {})),

  install(bin) {
    const settings = loadHooks();
    addFlatHook(settings, "stop", hookCommand(bin, "feed", "--agent", "cursor"));
    writeJson(hooksPath(), settings);
    return ["feeds after every response (token counts estimated — Cursor doesn't report usage)"];
  },

  uninstall() {
    if (!existsSync(hooksPath())) return;
    const settings = loadHooks();
    removeFlatHooks(settings);
    writeJson(hooksPath(), settings);
  },

  totals(payload) {
    const sessionId = payload.conversation_id || payload.session_id || payload.conversationId;
    if (!sessionId) return null;
    const path = payload.transcript_path || findTranscript(sessionId);
    if (!path) return null;
    return { sessionId, totals: cursorTotals(path) };
  },
};
