---
name: pet
description: Check on your birby — show the pet, its mood, streak, and how many tokens it has eaten
disable-model-invocation: true
allowed-tools: Bash
---

# Check on your birby

Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/pet.mjs"
```

Show the output to the user exactly as printed (it includes ASCII art — keep it
in a code block so the alignment survives). Do not add commentary beyond one
short friendly line; the pet card speaks for itself.

If the script says no birby is linked yet, tell the user to run `/birby:link`
(it opens the browser; one click and the pet hatches).
