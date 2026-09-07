import { join } from "node:path";
import { api, config, dataDir, humanize, petLine, readJson, todayTokens, writeJson } from "../lib.mjs";

const ART = {
  egg: ["  ▄▄▄▄  ", " █░░░░█ ", "█░░▒░░░█", "█░░░░▒░█", " ██████ "],
  hatchling: ["  ▄▄▄▄  ", " █◕  ◕█ ", " █ ▿  █ ", "█░▒░░▒░█", " ██████ "],
  chick: ["  ▄▄▄▄  ", " █◕  ◕█ ", "██ ▿▿ ██", " █▒▒▒▒█ ", "  ▀ ▀▀  "],
  birby: ["ヽ ▄▄▄▄ ノ", " █◕  ◕█ ", "██ ▿▿ ██", " █▒▒▒▒█ ", "  ▀ ▀▀  "],
  megabirby: ["✦ ▄▄▄▄ ✦", " █◕  ◕█ ", "██ ▿▿ ██", " █▒▒▒▒█ ", "  ▀ ▀▀  "],
};

/** Fetch fresh state (falling back to the cache) and print the pet card. */
export async function pet({ json } = {}) {
  const { token } = config();
  if (!token) {
    console.log("No birby linked yet — run `npx birby` to hatch one (takes one click).");
    return false;
  }
  const cachePath = join(dataDir(), "pet.json");
  const result = await api("/api/pet", { token });
  const cached = readJson(cachePath, null);
  const p = result?.pet || cached?.pet;
  if (!p) {
    console.log("Couldn't reach the birby API and no cached pet found. Try again later.");
    return false;
  }
  if (result?.pet) writeJson(cachePath, { pet: result.pet, updatedAt: Date.now() });
  if (json) {
    console.log(JSON.stringify({ ...p, todayTokens: todayTokens(), stale: !result?.pet }, null, 2));
    return true;
  }
  console.log((ART[p.stage] || ART.chick).join("\n"));
  console.log(petLine(p, todayTokens()));
  console.log(`fullness ${"█".repeat(Math.round(p.fullness / 10)).padEnd(10, "░")} ${p.fullness}%`);
  console.log(`lifetime ${humanize(p.lifetimeTokens)} tokens · stage: ${p.stage}`);
  if (p.tokensToNextStage != null) console.log(`next evolution in ${humanize(p.tokensToNextStage)} tokens`);
  if (!result?.pet) console.log("(offline — showing the last known state)");
  return true;
}
