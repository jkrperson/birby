---
name: link
description: Connect this machine to your birby.me pet — opens the browser, you click Approve, done
disable-model-invocation: true
allowed-tools: Bash
---

# Link your birby

The user wants to connect their coding agents to a birby.me pet. The `birby`
npm CLI does all of it: it links a pet, installs a feed hook into every agent
it finds on this machine (Claude Code, Codex, Gemini CLI, Cursor, OpenCode),
and keeps itself updated.

1. Run, passing any arguments the user gave through unchanged (a `brb_` token
   and/or a custom API URL for self-hosting are both optional):

   ```
   npx -y birby@latest --no-statusline
   ```

   With no token it starts a browser link: it prints a URL and a code, tries
   to open the browser, and waits for the user to click Approve. Show the URL
   and code to the user exactly as printed so they can open it themselves if
   the browser didn't pop up.

2. If the output contains `STILL_WAITING`, the user hasn't approved yet. Tell
   them to click Approve in the browser, then run the same command again (it
   resumes the pending link and continues the setup). Do this up to 3 times
   before giving up.

3. Show the final output verbatim — it lists the agents that were set up and
   greets them with their pet.

4. On success, offer one optional next step: showing the pet in the Claude Code
   statusline. If they say yes, run:

   ```
   npx -y birby@latest install claude-code --statusline
   ```

   It appends the pet to whatever statusline they already have and appears on
   the next session.

Never echo a `brb_` token back into the conversation beyond what the command
needs, and never store it anywhere except via the command above.
