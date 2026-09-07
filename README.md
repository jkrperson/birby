# birby 🐣

**Your coding agent burns tokens. Birby eats them.**

Birby is a tamagotchi for vibe coders: `npx birby` hooks into Claude Code,
Codex, Gemini CLI, Cursor, and OpenCode and feeds a pixel pet on
[birby.me](https://birby.me) with the tokens from every coding session. Your
pet gets full, keeps a daily streak, and evolves — egg → hatchling → chick →
birby → megabirby.

## Feed your pet (users)

```
npx birby
```

That's it. It opens your browser — sign in with GitHub, click **Approve** — then
installs a feed hook into every coding agent it finds on your machine:

| Agent       | Hook                                                          |
| ----------- | ------------------------------------------------------------- |
| Claude Code | `Stop` in `~/.claude/settings.json`                           |
| Codex       | `Stop` in `~/.codex/hooks.json` (enables the hooks feature)   |
| Gemini CLI  | `AfterAgent` in `~/.gemini/settings.json`                     |
| Cursor      | `stop` in `~/.cursor/hooks.json` — token counts are estimated |
| OpenCode    | plugin at `~/.config/opencode/plugins/birby.js`               |

Then just code. Your pet eats the tokens after every response. Check in with
`npx birby pet`; remove everything with `npx birby uninstall`.

Inside Claude Code you can also `/plugin marketplace add jkrperson/birby`,
`/plugin install birby@birby`, and run `/birby:link` — the plugin is a thin
wrapper that runs the same CLI.

Using CI, or an agent that isn't supported yet? Mint a connect token at
[birby.me/link](https://birby.me/link), then `npx birby login brb_yourtoken`
and `npx birby feed --tokens 1234` (or call the API directly, see below).
Self-hosting: `npx birby --api https://your.host`.

Optional extras:

- **Statusline pet** — `npx birby install claude-code --statusline` appends
  the pet to whatever Claude Code statusline you already have:

  → `🐤 Birby · happy · 🔥3 · 48.2k eaten today`

- **GitHub README badge**:

  ```markdown
  ![birby](https://birby.me/api/badge/yourusername.svg)
  ```

## Repo layout

pnpm + Turborepo monorepo:

| Path                  | What                                                        |
| --------------------- | ----------------------------------------------------------- |
| `apps/web`            | birby.me — Next.js site + API (Vercel, Neon, Drizzle)       |
| `packages/core`       | pet logic: feeding, fullness decay, streaks, evolution      |
| `packages/sprites`    | pixel art as data — grids render to canvas and SVG          |
| `packages/cli`        | `npx birby` — login, per-agent hook installers, feed, statusline |
| `plugins/claude-code` | Claude Code plugin: two skills that shell out to `npx birby`  |
| `.claude-plugin`      | marketplace manifest — this repo doubles as the marketplace |

## Develop

```bash
pnpm install
pnpm test          # core + sprites + cli unit tests
node packages/cli/bin/birby.mjs --help   # run the CLI from the checkout

cd apps/web
cp .env.example .env.local   # defaults to an embedded PGlite database
pnpm db:push       # create tables
pnpm dev
```

`DATABASE_URL=pglite://./.pglite` (the default in `.env.example` comments) runs
an embedded Postgres — no database setup needed. For real GitHub sign-in,
create an OAuth app at <https://github.com/settings/developers> with callback
`http://localhost:3000/api/auth/callback/github` and fill in
`AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.

To exercise the API without signing in, insert an `api_tokens` row whose
`token_hash` is the sha256 of a `brb_…` string, then:

```bash
curl -X POST localhost:3000/api/feed \
  -H "Authorization: Bearer brb_yourtoken" -H "Content-Type: application/json" \
  -d '{"tokens":{"input":1000,"output":500,"cache_read":0,"cache_creation":0},"session_id":"s1"}'
```

### Test the plugin locally

```
/plugin marketplace add /path/to/this/repo
/plugin install birby@birby
BIRBY_API_URL=http://localhost:3000 /birby:link brb_yourtoken
```

## Deploy

- **Web**: Vercel project rooted at `apps/web`, env vars from `.env.example`
  (Neon `DATABASE_URL`, GitHub OAuth pair, `AUTH_SECRET`,
  `NEXT_PUBLIC_BASE_URL=https://birby.me`). Run `pnpm db:push` once against
  Neon.
- **Plugin**: push this repo to GitHub; users add it with
  `/plugin marketplace add <owner>/<repo>`.

## API (for other agents)

Anything that can POST can feed a pet — the `agent` field is free-form:

- `POST /api/feed` — `Authorization: Bearer brb_…`, body
  `{"tokens": {"input", "output", "cache_read", "cache_creation"}, "session_id", "agent"}`
- `GET /api/pet` — current pet state
- Device flow (what `/birby:link` uses): `POST /api/device/start` →
  `{user_code, device_secret, verify_url, expires_in, interval}`; send the user
  to `verify_url`, then `POST /api/device/poll {device_secret}` every
  `interval` seconds until `{status: "approved", token}`.

MIT licensed.
