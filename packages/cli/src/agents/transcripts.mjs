// Transcript parsers: each takes a file (or directory) and returns cumulative
// token totals for that session. Feeding then posts the delta since the last
// run, so parsers only need to be consistent, not incremental.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_TOTALS } from "../lib.mjs";

function readLines(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // partial or foreign line — skip
    }
  }
  return out;
}

const num = (v) => Math.max(0, Number(v) || 0);

/** Claude Code: JSONL where assistant entries carry message.usage. Streamed
 * updates repeat a message id, so dedupe on it. */
export function claudeTotals(path) {
  const t = { ...EMPTY_TOTALS };
  const seen = new Set();
  for (const entry of readLines(path)) {
    const usage = entry?.message?.usage;
    if (!usage || typeof usage !== "object") continue;
    const id = entry.message.id || entry.uuid;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    t.input += num(usage.input_tokens);
    t.output += num(usage.output_tokens);
    t.cache_read += num(usage.cache_read_input_tokens);
    t.cache_creation += num(usage.cache_creation_input_tokens);
  }
  return t;
}

/** Codex: rollout JSONL with event_msg/token_count events whose
 * info.total_token_usage is already cumulative — take the last one. Codex
 * counts cached tokens inside input_tokens, so split them back out. */
export function codexTotals(path) {
  let last = null;
  for (const entry of readLines(path)) {
    const p = entry?.payload;
    if (entry?.type === "event_msg" && p?.type === "token_count" && p.info?.total_token_usage) {
      last = p.info.total_token_usage;
    }
  }
  if (!last) return { ...EMPTY_TOTALS };
  const cached = num(last.cached_input_tokens);
  return {
    input: Math.max(0, num(last.input_tokens) - cached),
    output: num(last.output_tokens),
    cache_read: cached,
    cache_creation: num(last.cache_write_input_tokens),
  };
}

/** Gemini CLI: one JSON document per session with messages[].tokens on model
 * replies. Falls back to Claude-style JSONL if the file is line-delimited. */
export function geminiTotals(path) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return claudeTotals(path);
  }
  const t = { ...EMPTY_TOTALS };
  const seen = new Set();
  for (const m of Array.isArray(doc?.messages) ? doc.messages : []) {
    const tk = m?.tokens;
    if (!tk || typeof tk !== "object") continue;
    if (m.id) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
    }
    const cached = num(tk.cached);
    t.input += Math.max(0, num(tk.input) - cached);
    t.cache_read += cached;
    t.output += num(tk.output) + num(tk.thoughts) + num(tk.tool);
  }
  return t;
}

/** OpenCode: storage/message/<session>/msg_*.json, assistant messages carry
 * tokens {input, output, reasoning, cache:{read, write}}. */
export function opencodeTotals(dir) {
  const t = { ...EMPTY_TOTALS };
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return t;
  }
  for (const f of files) {
    let m;
    try {
      m = JSON.parse(readFileSync(join(dir, f), "utf8"));
    } catch {
      continue;
    }
    if (m?.role !== "assistant" || !m.tokens) continue;
    t.input += num(m.tokens.input);
    t.output += num(m.tokens.output) + num(m.tokens.reasoning);
    t.cache_read += num(m.tokens.cache?.read);
    t.cache_creation += num(m.tokens.cache?.write);
  }
  return t;
}

/** Cursor: transcripts have no usage numbers, so estimate ~4 chars per token
 * from message text. User turns count as input, assistant turns as output. */
export function cursorTotals(path) {
  const t = { ...EMPTY_TOTALS };
  for (const entry of readLines(path)) {
    const content = entry?.message?.content;
    const chars = typeof content === "string" ? content.length : JSON.stringify(content ?? "").length;
    const est = Math.ceil(chars / 4);
    if (entry?.role === "assistant") t.output += est;
    else t.input += est;
  }
  return t;
}
