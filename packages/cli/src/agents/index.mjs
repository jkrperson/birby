import { claudeCode } from "./claude-code.mjs";
import { codex } from "./codex.mjs";
import { cursor } from "./cursor.mjs";
import { gemini } from "./gemini.mjs";
import { opencode } from "./opencode.mjs";

export const AGENTS = [claudeCode, codex, gemini, cursor, opencode];

export function agentById(id) {
  return AGENTS.find((a) => a.id === id) || null;
}

export function detectedAgents() {
  return AGENTS.filter((a) => {
    try {
      return a.detect();
    } catch {
      return false;
    }
  });
}
