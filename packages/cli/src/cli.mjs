import { parseArgs } from "./args.mjs";
import { VERSION } from "./lib.mjs";

const HELP = `birby ${VERSION} — feed your birby.me pet with every coding session

Usage:
  npx birby                      link a pet + set up every agent on this machine
  npx birby login [brb_token]    link (or re-link) this machine to your pet
  npx birby pet                  show your pet
  npx birby install [agent...]   (re)install hooks — default: all detected agents
  npx birby uninstall [agent...] remove hooks; --purge also deletes ~/.birby
  npx birby statusline           Claude Code statusline command (reads the cache)
  npx birby update               refresh the installed copy from npm
  npx birby logout               forget the token on this machine
  npx birby feed --tokens N      feed by hand (CI, scripts, unsupported agents)

Agents: claude-code, codex, gemini, cursor, opencode

Options:
  --api <url>        self-hosted birby API (also accepted as a bare URL)
  --statusline       install the Claude Code statusline without asking
  --no-statusline    never touch the statusline
  --relink           start a fresh browser link even if already linked
  --json             machine-readable output for \`pet\`
`;

export async function main(argv) {
  const { flags, positional } = parseArgs(argv);
  const [cmd, ...rest] = positional;

  if (flags.version) return console.log(VERSION);
  if (flags.help || cmd === "help") return console.log(HELP);

  try {
    switch (cmd) {
      case undefined:
      case "setup": {
        const { setup } = await import("./commands/setup.mjs");
        return await setup(flags, rest);
      }
      case "login":
      case "link": {
        const { login } = await import("./commands/login.mjs");
        const token = rest.find((a) => a.startsWith("brb_"));
        const apiUrl = flags.api || rest.find((a) => /^https?:\/\//.test(a));
        return await login({ token, apiUrl });
      }
      case "logout": {
        const { logout } = await import("./commands/login.mjs");
        return logout();
      }
      case "pet":
      case "status": {
        const { pet } = await import("./commands/pet.mjs");
        return await pet({ json: flags.json === true });
      }
      case "install": {
        const { install, installStatusline } = await import("./commands/install.mjs");
        console.log("Setting up your agents:");
        const done = install(rest);
        if (flags.statusline === true && done.some((a) => a.id === "claude-code")) installStatusline();
        return;
      }
      case "uninstall": {
        const { uninstall } = await import("./commands/install.mjs");
        return uninstall(rest, { purge: flags.purge === true });
      }
      case "feed": {
        const { feed } = await import("./commands/feed.mjs");
        return await feed(flags);
      }
      case "statusline": {
        const { statusline } = await import("./commands/statusline.mjs");
        return statusline();
      }
      case "update": {
        const { update } = await import("./commands/update.mjs");
        return update({ quiet: flags.quiet === true });
      }
      default:
        console.log(`Unknown command "${cmd}".\n\n${HELP}`);
        process.exitCode = 1;
    }
  } catch (e) {
    if (cmd === "feed" || cmd === "statusline") return; // hooks must stay silent
    console.error(e?.message || e);
    process.exitCode = 1;
  }
}
