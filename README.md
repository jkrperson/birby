# birby 🐣

**Your coding agent burns tokens. Birby eats them.**

Birby is a tamagotchi for vibe coders: a Claude Code plugin feeds a pixel pet
on [birby.me](https://birby.me) with the tokens from every coding session. Your
pet gets full, keeps a daily streak, and evolves — egg → hatchling → chick →
birby → megabirby.

## Feed your pet (users)

Inside Claude Code:

```
/plugin marketplace add jkrperson/birby
/plugin install birby@birby
/birby:link
```

`/birby:link` opens your browser — sign in with GitHub, click **Approve**, and
your egg is linked. (If Claude Code says the plugin needs activating, run
`/reload-plugins` first.)

Then just code. The plugin's `Stop` hook feeds your pet after every response —
no effort required. Check in with `/birby:pet`.

Using another agent, CI, or self-hosting? Mint a connect token at
[birby.me/link](https://birby.me/link) and run `/birby:link brb_yourtoken`, or
call the API directly (see below).

Optional extras:

- **Statusline pet** — add to `~/.claude/settings.json`:

  ```json
  {
    "statusLine": {
      "type": "command",
      "command": "node \"$HOME/.claude/plugins/<birby plugin dir>/scripts/statusline.mjs\""
    }
  }
  ```

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
| `plugins/claude-code` | the Claude Code plugin (hook + skills, zero npm deps)       |
| `.claude-plugin`      | marketplace manifest — this repo doubles as the marketplace |

## Develop

```bash
pnpm install
pnpm test          # core + sprites unit tests

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
