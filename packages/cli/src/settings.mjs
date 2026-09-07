// Pure helpers for editing agents' hook config files. Every function takes and
// returns plain objects; the agent adapters do the reading and writing. Only
// entries whose command points at ~/.birby/cli are ever touched.
import { isOurCommand } from "./lib.mjs";

/** Claude Code / Codex / Gemini shape:
 *  hooks[event] = [{ matcher?, hooks: [{ type: "command", command, timeout? }] }] */
export function addGroupedHook(settings, event, command, { timeout, matcher } = {}) {
  removeGroupedHooks(settings, event);
  const hook = { type: "command", command };
  if (timeout) hook.timeout = timeout;
  const group = { hooks: [hook] };
  if (matcher) group.matcher = matcher;
  settings.hooks = settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {};
  const list = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
  list.push(group);
  settings.hooks[event] = list;
  return settings;
}

/** Remove our grouped hooks for one event, or for every event when omitted. */
export function removeGroupedHooks(settings, onlyEvent) {
  if (!settings.hooks || typeof settings.hooks !== "object") return settings;
  for (const [event, groups] of Object.entries(settings.hooks)) {
    if (onlyEvent && event !== onlyEvent) continue;
    if (!Array.isArray(groups)) continue;
    const kept = groups
      .map((g) => {
        if (!g || !Array.isArray(g.hooks)) return g;
        return { ...g, hooks: g.hooks.filter((h) => !isOurCommand(h?.command)) };
      })
      .filter((g) => !g || !Array.isArray(g.hooks) || g.hooks.length > 0);
    if (kept.length) settings.hooks[event] = kept;
    else delete settings.hooks[event];
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  return settings;
}

/** Cursor shape: hooks[event] = [{ command }] */
export function addFlatHook(settings, event, command) {
  removeFlatHooks(settings, event);
  settings.hooks = settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {};
  const list = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
  list.push({ command });
  settings.hooks[event] = list;
  if (settings.version == null) settings.version = 1;
  return settings;
}

export function removeFlatHooks(settings, onlyEvent) {
  if (!settings.hooks || typeof settings.hooks !== "object") return settings;
  for (const [event, list] of Object.entries(settings.hooks)) {
    if (onlyEvent && event !== onlyEvent) continue;
    if (!Array.isArray(list)) continue;
    const kept = list.filter((h) => !isOurCommand(h?.command));
    if (kept.length) settings.hooks[event] = kept;
    else delete settings.hooks[event];
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  return settings;
}

/** Does this settings object contain any hook of ours? */
export function hasOurHooks(settings) {
  const hooks = settings?.hooks;
  if (!hooks || typeof hooks !== "object") return false;
  for (const list of Object.values(hooks)) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (isOurCommand(entry?.command)) return true;
      if (Array.isArray(entry?.hooks) && entry.hooks.some((h) => isOurCommand(h?.command))) return true;
    }
  }
  return false;
}

/** Claude Code statusline: take over the slot, remembering whatever was there
 * so `birby statusline` can run it first and append the pet. Returns the
 * previous statusLine object (or null) for the caller to persist. */
export function takeStatusline(settings, command) {
  const current = settings.statusLine;
  const previous = current && !isOurCommand(current.command) ? current : null;
  settings.statusLine = { type: "command", command };
  return previous;
}

export function releaseStatusline(settings, previous) {
  if (!isOurCommand(settings.statusLine?.command)) return settings;
  if (previous) settings.statusLine = previous;
  else delete settings.statusLine;
  return settings;
}

/** Minimal TOML edit: make sure `hooks = true` exists under [features].
 * Returns the new text, or the same text when nothing needed changing. */
export function ensureTomlFeature(text, key = "hooks") {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\[features\]\s*$/.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) {
    const sep = text.length === 0 || text.endsWith("\n") ? "" : "\n";
    return `${text}${sep}\n[features]\n${key} = true\n`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const re = new RegExp(`^\\s*${key}\\s*=`);
  for (let i = start + 1; i < end; i++) {
    if (re.test(lines[i])) {
      lines[i] = `${key} = true`;
      return lines.join("\n");
    }
  }
  lines.splice(start + 1, 0, `${key} = true`);
  return lines.join("\n");
}
