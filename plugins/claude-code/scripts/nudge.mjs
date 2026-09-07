#!/usr/bin/env node
// SessionStart hook: if the plugin is installed but no pet is linked, add one
// short note to Claude's context so it can mention /birby:link once. Rate
// limited to once a week so an unlinked install never becomes nagging.
import { join } from "node:path";
import { config, dataDir, readJson, writeJson } from "./lib.mjs";

const NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

try {
  if (!config().token) {
    const statePath = join(dataDir(), "state.json");
    const state = readJson(statePath, {});
    if (!state.nudgedAt || Date.now() - state.nudgedAt > NUDGE_INTERVAL_MS) {
      state.nudgedAt = Date.now();
      writeJson(statePath, state);
      console.log(
        "The birby plugin is installed but no pet is linked yet. At the end of your " +
          "first reply this session, add one short line telling the user they can run " +
          "/birby:link to hatch their birby (one click in the browser). Mention it once, " +
          "then never again.",
      );
    }
  }
} catch {
  // never break a session start
}
process.exit(0);
