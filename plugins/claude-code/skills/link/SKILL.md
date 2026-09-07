---
name: link
description: Connect this machine to your birby.me pet — opens the browser, you click Approve, done
disable-model-invocation: true
allowed-tools: Bash
---

# Link your birby

The user wants to connect Claude Code to their birby.me pet.

1. Run (pass any arguments the user gave through unchanged — a `brb_` token
   and/or a custom API URL for self-hosting are both optional):

   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/link.mjs" $ARGUMENTS
   ```

   With no token the script starts a browser link: it prints a URL and a code,
   tries to open the browser, and waits for the user to click Approve. Show
   the URL and code to the user exactly as printed so they can open it
   themselves if the browser didn't pop up.

2. If the output starts with `STILL_WAITING`, the user hasn't approved yet.
   Tell them to click Approve in the browser, then run the same command again
   (it resumes the pending link). Do this up to 3 times before giving up.

3. Show the final output verbatim — it greets them with their pet on success.

4. On success, offer one optional next step: showing the pet in the Claude Code
   statusline. If they say yes, add this to `~/.claude/settings.json` (merge
   into the existing file; don't clobber other settings), then tell them it
   appears on the next session:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/statusline.mjs\""
     }
   }
   ```

   Replace `${CLAUDE_PLUGIN_ROOT}` with its actual absolute path in the
   settings file (the statusline runs outside the plugin context).

Never echo a `brb_` token back into the conversation beyond what the command
needs, and never store it anywhere except via the script above.
