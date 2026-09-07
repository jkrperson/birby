import { describe, expect, it } from "vitest";
import {
  addFlatHook,
  addGroupedHook,
  ensureTomlFeature,
  hasOurHooks,
  releaseStatusline,
  removeFlatHooks,
  removeGroupedHooks,
  takeStatusline,
} from "../src/settings.mjs";

const OURS = 'node "/home/u/.birby/cli/bin/birby.mjs" feed --agent claude-code';
const THEIRS = "/opt/other/hook.sh";

describe("grouped hooks (Claude Code / Codex / Gemini)", () => {
  it("adds next to existing hooks without touching them", () => {
    const s = { hooks: { Stop: [{ hooks: [{ type: "command", command: THEIRS }] }] } };
    addGroupedHook(s, "Stop", OURS, { timeout: 15 });
    expect(s.hooks.Stop).toHaveLength(2);
    expect(s.hooks.Stop[0].hooks[0].command).toBe(THEIRS);
    expect(s.hooks.Stop[1]).toEqual({ hooks: [{ type: "command", command: OURS, timeout: 15 }] });
  });

  it("is idempotent", () => {
    const s = {};
    addGroupedHook(s, "Stop", OURS);
    addGroupedHook(s, "Stop", OURS);
    expect(s.hooks.Stop).toHaveLength(1);
  });

  it("removes only ours and cleans up empty containers", () => {
    const s = { hooks: { Stop: [{ hooks: [{ type: "command", command: THEIRS }, { type: "command", command: OURS }] }] } };
    expect(hasOurHooks(s)).toBe(true);
    removeGroupedHooks(s);
    expect(s.hooks.Stop[0].hooks).toEqual([{ type: "command", command: THEIRS }]);
    expect(hasOurHooks(s)).toBe(false);

    const only = {};
    addGroupedHook(only, "Stop", OURS);
    removeGroupedHooks(only);
    expect(only).toEqual({});
  });
});

describe("flat hooks (Cursor)", () => {
  it("adds, keeps version, removes", () => {
    const s = { version: 1, hooks: { stop: [{ command: THEIRS }] } };
    addFlatHook(s, "stop", OURS);
    expect(s.hooks.stop.map((h) => h.command)).toEqual([THEIRS, OURS]);
    removeFlatHooks(s);
    expect(s).toEqual({ version: 1, hooks: { stop: [{ command: THEIRS }] } });
  });
});

describe("statusline", () => {
  const OURS_SL = 'node "/home/u/.birby/cli/bin/birby.mjs" statusline';
  it("wraps an existing statusline and restores it", () => {
    const s = { statusLine: { type: "command", command: "~/.claude/statusline.sh" } };
    const prev = takeStatusline(s, OURS_SL);
    expect(prev).toEqual({ type: "command", command: "~/.claude/statusline.sh" });
    expect(s.statusLine.command).toBe(OURS_SL);
    // taking it again must not treat our own command as "previous"
    expect(takeStatusline(s, OURS_SL)).toBeNull();
    releaseStatusline(s, prev);
    expect(s.statusLine.command).toBe("~/.claude/statusline.sh");
  });

  it("removes the slot when there was nothing before", () => {
    const s = {};
    takeStatusline(s, OURS_SL);
    releaseStatusline(s, null);
    expect(s.statusLine).toBeUndefined();
  });

  it("leaves a foreign statusline alone on release", () => {
    const s = { statusLine: { type: "command", command: "other" } };
    releaseStatusline(s, null);
    expect(s.statusLine.command).toBe("other");
  });
});

describe("ensureTomlFeature", () => {
  it("appends a section when missing", () => {
    expect(ensureTomlFeature('model = "x"\n')).toBe('model = "x"\n\n[features]\nhooks = true\n');
  });
  it("adds the key inside an existing section", () => {
    const out = ensureTomlFeature('[features]\nfoo = false\n\n[other]\nhooks = false\n');
    expect(out).toBe('[features]\nhooks = true\nfoo = false\n\n[other]\nhooks = false\n');
  });
  it("flips an existing false and is otherwise a no-op", () => {
    expect(ensureTomlFeature("[features]\nhooks = false\n")).toBe("[features]\nhooks = true\n");
    const same = "[features]\nhooks = true\n";
    expect(ensureTomlFeature(same)).toBe(same);
  });
});
