# birby

**Your coding agent burns tokens. Birby eats them.**

```
npx birby
```

One command: links a [birby.me](https://birby.me) pet (sign in with GitHub,
click Approve), then installs a feed hook into every agent it finds on your
machine. From then on your pet eats the tokens from every session — no effort
required.

| Agent       | How it feeds                                              |
| ----------- | --------------------------------------------------------- |
| Claude Code | `Stop` hook in `~/.claude/settings.json`                  |
| Codex       | `Stop` hook in `~/.codex/hooks.json`                      |
| Gemini CLI  | `AfterAgent` hook in `~/.gemini/settings.json`            |
| Cursor      | `stop` hook in `~/.cursor/hooks.json` (tokens estimated)  |
| OpenCode    | plugin in `~/.config/opencode/plugins/birby.js`           |

```
npx birby pet                  # check in
npx birby install claude-code --statusline   # pet in the Claude Code statusline
npx birby uninstall            # remove every hook (add --purge to forget the token too)
npx birby feed --tokens 1234   # feed by hand from CI or an unsupported agent
```

The CLI copies itself to `~/.birby/cli` so hooks have a stable path, and checks
npm for a newer version once a day (`BIRBY_NO_AUTO_UPDATE=1` to opt out).
Hooks are silent by design; `BIRBY_DEBUG=1` makes them explain themselves.
