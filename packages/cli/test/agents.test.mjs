// Adapters against a fake $HOME: install is idempotent, uninstall leaves
// other people's hooks intact, and the OpenCode plugin file round-trips.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const home = mkdtempSync(join(tmpdir(), "birby-home-"));
process.env.BIRBY_TEST_HOME = home;
process.env.BIRBY_HOME = join(home, ".birby");
const BIN = join(home, ".birby", "cli", "bin", "birby.mjs");

let AGENTS, agentById;
beforeAll(async () => {
  ({ AGENTS, agentById } = await import("../src/agents/index.mjs"));
});

const read = (p) => JSON.parse(readFileSync(p, "utf8"));

describe("claude-code", () => {
  it("installs a Stop hook and wraps the statusline, then restores both", () => {
    const path = join(home, ".claude", "settings.json");
    mkdirSync(join(home, ".claude"), { recursive: true });
    writeFileSync(path, JSON.stringify({ model: "x", statusLine: { type: "command", command: "mine.sh" }, hooks: { Stop: [{ hooks: [{ type: "command", command: "other" }] }] } }));
    const a = agentById("claude-code");
    a.install(BIN);
    a.install(BIN);
    a.installStatusline(BIN);
    let s = read(path);
    expect(s.model).toBe("x");
    expect(s.hooks.Stop).toHaveLength(2);
    expect(s.statusLine.command).toContain("statusline");
    expect(a.installed()).toBe(true);
    a.uninstall();
    s = read(path);
    expect(s.hooks.Stop).toHaveLength(1);
    expect(s.statusLine).toEqual({ type: "command", command: "mine.sh" });
    expect(a.installed()).toBe(false);
  });
});

describe("codex", () => {
  it("writes hooks.json and enables the feature flag", () => {
    mkdirSync(join(home, ".codex"), { recursive: true });
    writeFileSync(join(home, ".codex", "config.toml"), 'model = "gpt"\n');
    const a = agentById("codex");
    const notes = a.install(BIN);
    expect(notes.join(" ")).toContain("enabled hooks");
    expect(readFileSync(join(home, ".codex", "config.toml"), "utf8")).toContain("[features]\nhooks = true");
    expect(read(join(home, ".codex", "hooks.json")).hooks.Stop[0].hooks[0].command).toContain("--agent codex");
    expect(a.install(BIN).join(" ")).not.toContain("enabled hooks");
    a.uninstall();
    expect(read(join(home, ".codex", "hooks.json"))).toEqual({});
  });
});

describe("gemini", () => {
  it("adds an AfterAgent hook and answers hooks with {}", () => {
    mkdirSync(join(home, ".gemini"), { recursive: true });
    const a = agentById("gemini");
    a.install(BIN);
    expect(read(join(home, ".gemini", "settings.json")).hooks.AfterAgent[0].hooks[0].command).toContain("--agent gemini");
    expect(a.hookStdout).toBe("{}");
    a.uninstall();
  });
});

describe("cursor", () => {
  it("uses the flat hook shape", () => {
    mkdirSync(join(home, ".cursor"), { recursive: true });
    const a = agentById("cursor");
    a.install(BIN);
    const s = read(join(home, ".cursor", "hooks.json"));
    expect(s.version).toBe(1);
    expect(s.hooks.stop[0].command).toContain("--agent cursor");
    a.uninstall();
    expect(read(join(home, ".cursor", "hooks.json")).hooks).toBeUndefined();
  });
});

describe("opencode", () => {
  it("drops a plugin file and removes it again", () => {
    const a = agentById("opencode");
    a.install(BIN);
    const p = join(home, ".config", "opencode", "plugins", "birby.js");
    expect(readFileSync(p, "utf8")).toContain("session.idle");
    expect(a.installed()).toBe(true);
    a.uninstall();
    expect(existsSync(p)).toBe(false);
  });
});

describe("registry", () => {
  it("knows five agents", () => {
    expect(AGENTS.map((a) => a.id)).toEqual(["claude-code", "codex", "gemini", "cursor", "opencode"]);
  });
});
