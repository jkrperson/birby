import { rmSync } from "node:fs";
import { createInterface } from "node:readline";
import { AGENTS, agentById, detectedAgents } from "../agents/index.mjs";
import { dataDir } from "../lib.mjs";
import { installSelf } from "../self-install.mjs";

export function resolveAgents(ids) {
  if (!ids.length) return detectedAgents();
  return ids.map((id) => {
    const a = agentById(id);
    if (!a) throw new Error(`Unknown agent "${id}". Known: ${AGENTS.map((x) => x.id).join(", ")}`);
    return a;
  });
}

/** Install hooks for the given agents (all detected ones when empty). */
export function install(ids = [], { quiet = false } = {}) {
  const agents = resolveAgents(ids);
  if (!agents.length) {
    console.log(`No supported agent found. Known: ${AGENTS.map((a) => a.id).join(", ")}.`);
    console.log("Run `birby install <agent>` to force one, or feed manually: `birby feed --tokens 1234`.");
    return [];
  }
  const bin = installSelf();
  const done = [];
  for (const a of agents) {
    try {
      const notes = a.install(bin);
      done.push(a);
      if (!quiet) console.log(`  ✓ ${a.label} — ${notes.join("; ")}`);
    } catch (e) {
      console.log(`  ✗ ${a.label} — ${e.message}`);
    }
  }
  return done;
}

export function installStatusline({ quiet = false } = {}) {
  const claude = agentById("claude-code");
  const bin = installSelf();
  const note = claude.installStatusline(bin);
  if (!quiet) console.log(`  ✓ Claude Code — ${note} (appears on your next session)`);
}

export function uninstall(ids = [], { purge = false } = {}) {
  const agents = ids.length ? resolveAgents(ids) : AGENTS;
  for (const a of agents) {
    try {
      a.uninstall();
      console.log(`  ✓ ${a.label} — hooks removed`);
    } catch (e) {
      console.log(`  ✗ ${a.label} — ${e.message}`);
    }
  }
  if (purge) {
    rmSync(dataDir(), { recursive: true, force: true });
    console.log("  ✓ removed ~/.birby (token, cache, and the installed CLI)");
  }
}

export async function confirm(question, fallback) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return fallback;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question(`${question} ${fallback ? "[Y/n]" : "[y/N]"} `, r));
  rl.close();
  const a = answer.trim().toLowerCase();
  if (!a) return fallback;
  return a === "y" || a === "yes";
}
