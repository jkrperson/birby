// Hook entrypoint. Runs after every agent turn, so it must never print
// anything unexpected, never take long, and never exit non-zero.
import { spawn } from "node:child_process";
import { join } from "node:path";
import { agentById } from "../agents/index.mjs";
import {
  EMPTY_TOTALS,
  api,
  debug,
  config,
  dataDir,
  installedBin,
  readState,
  readStdinJson,
  saveState,
  sumTokens,
  todayKey,
  writeJson,
} from "../lib.mjs";
import { runningFromInstall } from "../self-install.mjs";

const UPDATE_CHECK_MS = 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 50;

export function computeDelta(totals, reported = EMPTY_TOTALS) {
  const delta = {};
  for (const key of Object.keys(EMPTY_TOTALS)) {
    delta[key] = Math.max(0, (totals[key] || 0) - (reported[key] || 0));
  }
  return delta;
}

function manualTotals(flags) {
  const t = { ...EMPTY_TOTALS };
  if (flags.tokens) t.input = Number(flags.tokens) || 0;
  if (flags.input) t.input = Number(flags.input) || 0;
  if (flags.output) t.output = Number(flags.output) || 0;
  if (flags["cache-read"]) t.cache_read = Number(flags["cache-read"]) || 0;
  if (flags["cache-write"]) t.cache_creation = Number(flags["cache-write"]) || 0;
  return sumTokens(t) > 0 ? t : null;
}

function recordFeed(state, total, result) {
  const today = todayKey();
  state.todayTokens = (state.today === today ? state.todayTokens || 0 : 0) + total;
  state.today = today;
  writeJson(join(dataDir(), "pet.json"), { pet: result.pet, updatedAt: Date.now() });
}

/** Once a day, refresh ~/.birby/cli in the background. Opt out with
 * BIRBY_NO_AUTO_UPDATE=1. Only the installed copy does this — a dev checkout
 * or an npx run shouldn't overwrite anything. */
function maybeAutoUpdate(state) {
  if (process.env.BIRBY_NO_AUTO_UPDATE || !runningFromInstall()) return;
  if (Date.now() - (state.updateCheckedAt || 0) < UPDATE_CHECK_MS) return;
  state.updateCheckedAt = Date.now();
  try {
    spawn(process.execPath, [installedBin(), "update", "--quiet"], { stdio: "ignore", detached: true }).unref();
  } catch {
    // next time
  }
}

export async function feed(flags) {
  const agentId = typeof flags.agent === "string" ? flags.agent : "claude-code";
  const adapter = agentById(agentId);
  try {
    const { token } = config();
    if (!token) return debug("no token; run `npx birby`");
    const payload = readStdinJson();
    debug(`agent=${agentId} payload keys=${Object.keys(payload).join(",") || "(none)"}`);

    const manual = manualTotals(flags);
    let delta;
    let sessionId = flags["session-id"];
    const state = readState();
    state.sessions = state.sessions || {};
    let key = null;
    let totals = null;

    if (manual) {
      delta = manual;
    } else {
      if (!adapter) return;
      const found = adapter.totals(payload, flags);
      if (!found) return debug("no session/transcript found in payload");
      ({ sessionId, totals } = found);
      key = `${agentId}:${sessionId}`;
      // The old Claude Code plugin stored sessions under the bare id.
      const legacy = agentId === "claude-code" ? state.sessions[sessionId] : undefined;
      delta = computeDelta(totals, state.sessions[key] || legacy);
      if (legacy) delete state.sessions[sessionId];
    }
    const total = sumTokens(delta);
    debug(`session=${sessionId} delta=${JSON.stringify(delta)}`);
    if (total <= 0) return;

    const result = await api("/api/feed", {
      method: "POST",
      token,
      body: { tokens: delta, session_id: sessionId || null, agent: agentId },
    });
    if (!result?.pet) return debug("api returned no pet");

    if (key) {
      state.sessions[key] = totals;
      const ids = Object.keys(state.sessions);
      if (ids.length > MAX_SESSIONS) {
        for (const id of ids.slice(0, ids.length - MAX_SESSIONS)) delete state.sessions[id];
      }
    }
    recordFeed(state, total, result);
    maybeAutoUpdate(state);
    saveState(state);
    if (flags.quiet !== true && process.stdout.isTTY) {
      console.log(`Fed ${total} tokens. ${result.pet.name} is ${result.pet.mood}.`);
    }
  } catch (e) {
    debug(`feed error: ${e?.stack || e}`);
  } finally {
    if (adapter?.hookStdout) process.stdout.write(adapter.hookStdout + "\n");
  }
}
