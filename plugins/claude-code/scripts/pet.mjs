#!/usr/bin/env node
// Fetch fresh pet state and print a small card for /birby:pet.
import { join } from "node:path";
import { api, config, dataDir, humanize, petLine, readJson, writeJson } from "./lib.mjs";

const ART = {
  egg: ["  ▄▄▄▄  ", " █░░░░█ ", "█░░▒░░░█", "█░░░░▒░█", " ██████ "],
  hatchling: ["  ▄▄▄▄  ", " █◕  ◕█ ", " █ ▿  █ ", "█░▒░░▒░█", " ██████ "],
  chick: ["  ▄▄▄▄  ", " █◕  ◕█ ", "██ ▿▿ ██", " █▒▒▒▒█ ", "  ▀ ▀▀  "],
  birby: ["ヽ ▄▄▄▄ ノ", " █◕  ◕█ ", "██ ▿▿ ██", " █▒▒▒▒█ ", "  ▀ ▀▀  "],
  megabirby: ["✦ ▄▄▄▄ ✦", " █◕  ◕█ ", "██ ▿▿ ██", " █▒▒▒▒█ ", "  ▀ ▀▀  "],
};

const { token } = config();
if (!token) {
  console.log("No birby linked yet — run /birby:link to hatch one (takes one click).");
  process.exit(0);
}

const result = await api("/api/pet", { token });
const cached = readJson(join(dataDir(), "pet.json"), null);
const pet = result?.pet || cached?.pet;
if (!pet) {
  console.log("Couldn't reach the birby API and no cached pet found. Try again later.");
  process.exit(0);
}
if (result?.pet) {
  writeJson(join(dataDir(), "pet.json"), { pet: result.pet, updatedAt: Date.now() });
}

const state = readJson(join(dataDir(), "state.json"), {});
const today = new Date().toISOString().slice(0, 10);
const todayTokens = state.today === today ? state.todayTokens || 0 : 0;

console.log((ART[pet.stage] || ART.chick).join("\n"));
console.log(petLine(pet, todayTokens));
console.log(`fullness ${"█".repeat(Math.round(pet.fullness / 10)).padEnd(10, "░")} ${pet.fullness}%`);
console.log(`lifetime ${humanize(pet.lifetimeTokens)} tokens · stage: ${pet.stage}`);
if (pet.tokensToNextStage != null) {
  console.log(`next evolution in ${humanize(pet.tokensToNextStage)} tokens`);
}
if (!result?.pet) {
  console.log("(offline — showing cached state)");
}
