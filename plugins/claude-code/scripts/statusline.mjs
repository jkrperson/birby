#!/usr/bin/env node
// Statusline: render the pet from the local cache written by feed.mjs.
// No network calls here — this runs on every statusline refresh.
import { join } from "node:path";
import { dataDir, petLine, readJson, readStdinJson } from "./lib.mjs";

readStdinJson(); // consume stdin; cache is the source of truth

const cache = readJson(join(dataDir(), "pet.json"), null);
const state = readJson(join(dataDir(), "state.json"), {});
const today = new Date().toISOString().slice(0, 10);
const todayTokens = state.today === today ? state.todayTokens || 0 : 0;

if (cache?.pet) {
  console.log(petLine(cache.pet, todayTokens));
} else {
  console.log("🥚 birby · run /birby:link to hatch");
}
