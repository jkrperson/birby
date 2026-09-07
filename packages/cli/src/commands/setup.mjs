// `npx birby` with no arguments: the whole thing in one go.
//   1. link a pet (device flow) unless already linked
//   2. install hooks for every agent found on this machine
//   3. offer the Claude Code statusline
//   4. show the pet
import { agentById } from "../agents/index.mjs";
import { VERSION, config } from "../lib.mjs";
import { confirm, install, installStatusline } from "./install.mjs";
import { login } from "./login.mjs";
import { pet } from "./pet.mjs";

export async function setup(flags, positional) {
  console.log(`birby ${VERSION} — your agent burns tokens, birby eats them.\n`);

  const token = positional.find((a) => a.startsWith("brb_"));
  const apiOverride = flags.api || positional.find((a) => /^https?:\/\//.test(a));

  if (!config().token || flags.relink || token) {
    const ok = await login({ token, apiUrl: apiOverride });
    if (!ok) return;
    console.log();
  } else if (apiOverride) {
    await login({ apiUrl: apiOverride, token: config().token });
  }

  if (flags["no-install"]) return pet();

  console.log("Setting up your agents:");
  const done = install([]);
  console.log();

  const claude = agentById("claude-code");
  if (done.includes(claude) && !flags["no-statusline"]) {
    const want = flags.statusline === true || (await confirm("Show your birby in the Claude Code statusline?", true));
    if (want) {
      installStatusline();
      console.log();
    }
  }

  await pet();
  if (done.length) {
    console.log(`\nDone. ${done.map((a) => a.label).join(", ")} will feed your birby automatically, starting with your next session.`);
    console.log("Check in any time with `npx birby pet`. Remove everything with `npx birby uninstall`.");
  }
}
