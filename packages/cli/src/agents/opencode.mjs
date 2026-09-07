import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { commandExists, homeDir } from "../lib.mjs";
import { opencodeTotals } from "./transcripts.mjs";

const configDir = () => process.env.XDG_CONFIG_HOME || join(homeDir(), ".config");
const dataRoot = () => process.env.XDG_DATA_HOME || join(homeDir(), ".local", "share");
const pluginPath = () => join(configDir(), "opencode", "plugins", "birby.js");
const storageDir = () => join(dataRoot(), "opencode", "storage");

/** OpenCode has no shell hooks; it loads JS plugins from its config dir. This
 * one just shells out to the CLI when a session goes idle. */
function pluginSource(bin) {
  return `// Installed by birby (https://birby.me). Managed file — \`birby uninstall\` removes it.
import { spawn } from "node:child_process";

const BIRBY_BIN = ${JSON.stringify(bin)};

export const BirbyPlugin = async () => ({
  event: async ({ event }) => {
    if (event?.type !== "session.idle") return;
    const sessionID = event.properties?.sessionID;
    if (!sessionID) return;
    try {
      spawn("node", [BIRBY_BIN, "feed", "--agent", "opencode", "--session-id", sessionID], {
        stdio: "ignore",
        detached: true,
      }).unref();
    } catch {
      // never disturb the session
    }
  },
});
`;
}

export const opencode = {
  id: "opencode",
  label: "OpenCode",
  detect: () => existsSync(join(configDir(), "opencode")) || existsSync(storageDir()) || commandExists("opencode"),
  installed: () => {
    try {
      return readFileSync(pluginPath(), "utf8").includes("Installed by birby");
    } catch {
      return false;
    }
  },

  install(bin) {
    mkdirSync(join(configDir(), "opencode", "plugins"), { recursive: true });
    writeFileSync(pluginPath(), pluginSource(bin));
    return ["feeds when a session goes idle"];
  },

  uninstall() {
    if (this.installed()) rmSync(pluginPath(), { force: true });
  },

  totals(payload, flags) {
    const sessionId = flags["session-id"] || payload.sessionID || payload.session_id;
    if (!sessionId) return null;
    return { sessionId, totals: opencodeTotals(join(storageDir(), "message", sessionId)) };
  },
};
