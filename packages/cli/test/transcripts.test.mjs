import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claudeTotals, codexTotals, cursorTotals, geminiTotals, opencodeTotals } from "../src/agents/transcripts.mjs";
import { computeDelta } from "../src/commands/feed.mjs";

const dir = mkdtempSync(join(tmpdir(), "birby-"));
const write = (name, content) => {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
};
const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";

describe("claudeTotals", () => {
  it("sums usage and dedupes streamed repeats", () => {
    const p = write(
      "claude.jsonl",
      jsonl([
        { type: "user", uuid: "u1", message: { role: "user", content: "hi" } },
        { message: { id: "m1", usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 7 } } },
        { message: { id: "m1", usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 7 } } },
        { message: { id: "m2", usage: { input_tokens: 1, output_tokens: 2 } } },
      ]) + "not json\n",
    );
    expect(claudeTotals(p)).toEqual({ input: 11, output: 7, cache_read: 100, cache_creation: 7 });
  });
  it("is empty for a missing file", () => {
    expect(claudeTotals(join(dir, "nope.jsonl"))).toEqual({ input: 0, output: 0, cache_read: 0, cache_creation: 0 });
  });
});

describe("codexTotals", () => {
  it("uses the last cumulative token_count and splits cached out of input", () => {
    const p = write(
      "codex.jsonl",
      jsonl([
        { type: "session_meta", payload: { id: "s" } },
        { type: "event_msg", payload: { type: "token_count", info: null } },
        { type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 100, cached_input_tokens: 60, cache_write_input_tokens: 0, output_tokens: 10 } } } },
        { type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 1000, cached_input_tokens: 700, cache_write_input_tokens: 5, output_tokens: 40 } } } },
      ]),
    );
    expect(codexTotals(p)).toEqual({ input: 300, output: 40, cache_read: 700, cache_creation: 5 });
  });
});

describe("geminiTotals", () => {
  it("reads messages[].tokens from the chat document", () => {
    const p = write(
      "gemini.json",
      JSON.stringify({
        sessionId: "g1",
        messages: [
          { id: "a", type: "user", content: "hi" },
          { id: "b", type: "gemini", tokens: { input: 8444, output: 9, cached: 400, thoughts: 24, tool: 3 } },
          { id: "b", type: "gemini", tokens: { input: 8444, output: 9, cached: 400, thoughts: 24, tool: 3 } },
        ],
      }),
    );
    expect(geminiTotals(p)).toEqual({ input: 8044, output: 36, cache_read: 400, cache_creation: 0 });
  });
});

describe("opencodeTotals", () => {
  it("sums assistant messages in the session's storage dir", () => {
    const d = join(dir, "ses_1");
    mkdirSync(d);
    writeFileSync(join(d, "m1.json"), JSON.stringify({ role: "user" }));
    writeFileSync(join(d, "m2.json"), JSON.stringify({ role: "assistant", tokens: { input: 10, output: 5, reasoning: 2, cache: { read: 100, write: 3 } } }));
    writeFileSync(join(d, "m3.json"), JSON.stringify({ role: "assistant", tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } } }));
    expect(opencodeTotals(d)).toEqual({ input: 11, output: 8, cache_read: 100, cache_creation: 3 });
    expect(opencodeTotals(join(dir, "missing"))).toEqual({ input: 0, output: 0, cache_read: 0, cache_creation: 0 });
  });
});

describe("cursorTotals", () => {
  it("estimates from text length by role", () => {
    const p = write(
      "cursor.jsonl",
      jsonl([
        { role: "user", message: { content: [{ type: "text", text: "x".repeat(40) }] } },
        { role: "assistant", message: { content: "y".repeat(8) } },
      ]),
    );
    const t = cursorTotals(p);
    expect(t.output).toBe(2);
    expect(t.input).toBeGreaterThan(10);
  });
});

describe("computeDelta", () => {
  it("never goes negative and treats missing as zero", () => {
    expect(computeDelta({ input: 10, output: 5, cache_read: 0, cache_creation: 0 }, { input: 12, output: 1 })).toEqual({
      input: 0,
      output: 4,
      cache_read: 0,
      cache_creation: 0,
    });
  });
});
