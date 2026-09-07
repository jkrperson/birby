#!/usr/bin/env node
// Stop hook: sum token usage from the session transcript and feed the delta
// to the birby API. Must NEVER break a session: every failure exits 0 silently.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  api,
  config,
  dataDir,
  readJson,
  readStdinJson,
  writeJson,
} from "./lib.mjs";

function transcriptTotals(path) {
  // The transcript format is internal to Claude Code and may change between
  // versions — parse defensively: scan every line for a message.usage object,
  // dedupe by message id (streamed updates repeat), ignore anything unknown.
  const totals = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return totals;
  }
  const seen = new Set();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const usage = entry?.message?.usage;
    if (!usage || typeof usage !== "object") continue;
    const id = entry.message.id || entry.uuid;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    totals.input += Number(usage.input_tokens) || 0;
    totals.output += Number(usage.output_tokens) || 0;
    totals.cache_read += Number(usage.cache_read_input_tokens) || 0;
    totals.cache_creation += Number(usage.cache_creation_input_tokens) || 0;
  }
  return totals;
}

async function main() {
  const { token } = config();
  if (!token) return;
  const input = readStdinJson();
  const sessionId = input.session_id;
  if (!sessionId || !input.transcript_path) return;

  const totals = transcriptTotals(input.transcript_path);
  const statePath = join(dataDir(), "state.json");
  const state = readJson(statePath, { sessions: {}, today: "", todayTokens: 0 });
  const reported = state.sessions[sessionId] || {
    input: 0,
    output: 0,
    cache_read: 0,
    cache_creation: 0,
  };
  const delta = {};
  let total = 0;
  for (const key of Object.keys(totals)) {
    delta[key] = Math.max(0, totals[key] - (reported[key] || 0));
    total += delta[key];
  }
  if (total <= 0) return;

  const result = await api("/api/feed", {
    method: "POST",
    token,
    body: { tokens: delta, session_id: sessionId, agent: "claude-code" },
  });
  if (!result) return;

  state.sessions[sessionId] = totals;
  // Keep only the most recent sessions to stop the file growing forever.
  const ids = Object.keys(state.sessions);
  if (ids.length > 50) {
    for (const id of ids.slice(0, ids.length - 50)) delete state.sessions[id];
  }
  const today = new Date().toISOString().slice(0, 10);
  state.todayTokens = (state.today === today ? state.todayTokens : 0) + total;
  state.today = today;
  writeJson(statePath, state);
  writeJson(join(dataDir(), "pet.json"), { pet: result.pet, updatedAt: Date.now() });
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
