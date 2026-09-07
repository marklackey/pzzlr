---
name: pzzlr-dev
description: Dev workflow reference for the pzzlr word-ladder repo (graphbuilder/ Go tool, sdk/ embeddable Svelte widget, website/ SvelteKit app). Use this whenever working in this repo and the task involves starting the dev server, running tests (vitest or go test), type/lint checks, regenerating word graphs from the ESDB word list (including the 50/60/80 dictionary size tiers), building or syncing the SDK widget into the website, Cloudflare D1 database commands (generate/migrate/seed, local or remote), smoke-testing a game's daily-puzzle API endpoint, or visually QA-ing an auth-gated or rare-scenario page. Trigger even if the user doesn't name these commands explicitly — e.g. "run the tests", "the graphs seem stale", "check today's puzzle for game X", "wire up the new SDK build", "reset my local db", "add a smaller dictionary option".
---

# pzzlr dev workflows

Three packages, each with its own commands — run everything from that package's directory (`cd website && ...`, not from repo root).

## Dev server

Already configured as `pzzlr-website` in `.claude/launch.json` (port 5173). Use the Browser-pane preview tool (`preview_start` with `{name: "pzzlr-website"}`) rather than `Bash` so it runs supervised and you can read its logs/console — don't hand-roll `npm run dev` in a background Bash call for this.

## Tests

- Website (vitest): `cd website && npm run test` — this is the one-shot `--run` variant, safe to call from Bash. `npm run test:unit` alone starts vitest in watch mode; don't use that from Bash, it never exits.
- Graphbuilder (Go): `cd graphbuilder && go test ./...`

Run both when a change touches the ladder engine (`website/src/lib/server/engine/`) *and* the graph format (`graphbuilder/graph.go`), since the two have to agree on adjacency shape.

## Type checking & lint

- `cd website && npm run check` — svelte-check + tsc, no emit.
- `cd website && npm run lint` — `prettier --check .` + `eslint .`, read-only.
- `cd website && npm run format` — same as lint but writes fixes.

## Regenerating word graphs

pzzlr ships three ESDB size tiers — 50, 60, 80 (see `graphbuilder/data/esdb/README.md` for what each means; 80 is the full/original dictionary, 50 the smallest/most-common-words-only). The graphs under `website/src/lib/server/data/graphs/<size>/graph-*.json` are committed, generated output — not hand-edited. If the ESDB source word lists change, or `graphbuilder/graph.go`'s adjacency logic changes, regenerate and re-sync **all three tiers**:

```bash
cd graphbuilder && for s in 50 60 80; do go run . -size $s; done
cd ../website && npm run sync-graphs
```

`-size` picks both the default input (`data/esdb/words-<size>-A.txt`) and output dir (`output/<size>`) — pass `-input`/`-output` explicitly only to override those. Each run prints a per-length table (words/edges/isolated) to stdout and writes `output/<size>/manifest.json` — check `isolated` isn't suspiciously high after a change, since an isolated word can never appear as a puzzle rung (see `pickPuzzle`'s doc comment in `ladder.ts` about sparse buckets). Length 8 is inherently sparse at every tier (roughly half of all 8-letter words have zero one-letter-away neighbors), so `pickDailyPuzzle`/`assertDailySolvable` fail there noticeably more often (~35% of random seeds) than at lengths 3–7 (effectively never) — that's expected, not a regression, and retrying (a fresh game id reseeds the draw) usually succeeds.

`sync-graphs` wipes and re-copies the whole `graphbuilder/output/` tree (all size subdirs) into the website's data dir — the website reads this JSON at build/runtime via an `import.meta.glob` in `server/graphs.ts`, it doesn't call the Go tool itself. To fetch a fresh ESDB release for all three tiers at once (one clone, one build, three extracts): `cd graphbuilder/data/esdb && ./fetch.sh` (or `./fetch.sh 50` etc. for just one size).

### Dictionary size is a per-game setting

`game_config.dictionarySize` (50/60/80, default 80) pins which tier a game's puzzles/valid-guesses are drawn from — same reasoning as `minSteps`/`rungsGiven`: it has to be fixed per game or "today's puzzle" stops being well-defined. `getGraph(length, size)` in `server/graphs.ts` takes a plain `number` (not the narrower `DictionarySize` union) because it's usually called with a DB row's column, which drizzle infers as `number`. The canonical list of sizes and their UI labels live in `$lib/types.ts` (`DICTIONARY_SIZES`, `DICTIONARY_LABELS`, `DEFAULT_DICTIONARY_SIZE`) rather than under `server/` — `GameForm.svelte` needs them client-side, and SvelteKit forbids importing `$lib/server/*` into browser-reachable code.

## SDK widget

`sdk/` builds the `<pzzlr-ladder>`/`<pzzlr-wordle>` custom elements that the website embeds. After changing `sdk/src/*`:

```bash
cd sdk && npm run build
cd ../website && npm run sync-sdk
```

`sync-sdk` copies `sdk/dist/pzzlr-sdk.js` into `website/static/sdk/`. The website's own `npm run build` already runs `sync-sdk` first, but the dev server does *not* — if you're iterating on the SDK against the running dev server, either re-run `sync-sdk` by hand after each SDK build, or use `cd sdk && npm run dev` (vite build --watch) in a second terminal and re-sync when you want the website to pick up a new build.

**Verifying a rebuilt widget in the browser needs a hard reload, not a soft nav.** `customElements.define(...)` can only run once per tag name per document — SvelteKit's client-side routing between `/g/[id]` pages reuses the same document, so navigating to a *different* game after rebuilding the SDK still runs the *old*, already-registered custom element class. The page will look like the fix didn't apply (or like a totally different, confusing bug) even though the served `/sdk/pzzlr-sdk.js` file is current. Force a real reload (`location.reload()`, or a fresh `preview_start`/`navigate`) after every SDK rebuild before trusting what you see.

**Both widgets are shadow-DOM custom elements, which default to `display: inline`.** Their root `.ladder`/`.wordle` div uses `width: 100%` to fill whatever contains it (capped by its own `max-width`, currently 26rem) — that only resolves against a concrete width if the *host element* participates in layout as a block box, so both components set `:host { display: block; width: 100%; box-sizing: border-box; }` in their `<style>`. Dropping that rule silently breaks responsive sizing (the widget goes back to sizing purely off its content, e.g. the board-card overflow bug below), so keep it if you touch the root styles.

**Tile and on-screen-keyboard sizing is flex-based, not fixed-px, on purpose.** Word length varies 3–8 across both engines, and length-8 boards (`8 × 2.6rem` tiles + gaps ≈ 23.6rem) don't fit the old fixed `max-width: 22rem` wrapper — and a fixed-width board never fits a narrow mobile viewport either. `.tile` uses `flex: 1 1 0; max-width: 2.6rem; aspect-ratio: 1` (grows to fill the row up to a comfortable cap, shrinks below it only when the row itself is narrower) and `.krow button` uses `flex: 1; min-width: 0` (same idea for keyboard keys, with `button.wide` — Enter/Backspace — at `flex: 1.8`). The `overflow: hidden; white-space: nowrap` on `button`, plus `text-overflow: ellipsis` scoped to `.wide`, is what keeps "Enter" from visibly bleeding past its own rounded corners on the tightest realistic case (an 8-letter word's keyboard on a 375px phone) — it degrades to "ENT…" there instead, never spilling outside the box. If you touch this CSS, re-check both that tightest case *and* the common case (a 4–5 letter word) at 375px width, since the two pull in opposite directions (cap too small wastes space normally; cap too generous overflows on 8-letter boards).

**The website wraps each widget in a `.board-card`** (in `+page.svelte` and `g/[id]/+page.svelte`) that must give it a concrete resolved width too: `width: min(100%, 26rem); box-sizing: border-box` — not `display: inline-block`, which sizes to content and doesn't shrink for a narrow viewport, which is exactly how the mobile overflow bug happened (the card just became wider than the screen instead of ever shrinking).

**Any new embeddable API route needs adding to `EMBED_ROUTES` in `website/src/hooks.server.ts`.** That regex allowlist is what attaches permissive CORS headers — miss it and the route works fine same-origin (so it's easy not to notice in normal dev testing) but silently fails cross-origin, breaking the widget on any real third-party embed page. This bit us once already: adding `/api/games/[id]/guess` and deleting the old generic `/api/ladder/guess` required updating this list too, not just adding the route file.

## Database (Cloudflare D1 / Drizzle)

The database is Cloudflare D1, which is only reachable through the Workers
runtime — there is no connection string and no `DATABASE_URL`. `getDb()` in
`src/lib/server/db/index.ts` wraps the `DB` binding declared in
`wrangler.jsonc`, and that binding only exists once a request is actually in
flight, so every command below goes through `wrangler` rather than a plain
Node script. All from `website/`:

- `npm run db:generate` — write a migration file into `migrations/` from
  `schema.ts` changes. This is drizzle-kit generating SQL only; it never
  touches a live database (see the comment in `drizzle.config.ts`).
- `npm run db:migrate` — apply pending migrations to the **local** D1
  (`wrangler d1 migrations apply pzzlr --local`).
- `npm run db:migrate:remote` — the same against production D1.
- `npm run db:seed` — upserts the `demo` game (`target: "poop"`, length 4,
  minSteps 4) from `scripts/seed.sql`. Safe to re-run.
  `db:seed:remote` does it against production.

There is no `db:push` and no Drizzle Studio — both want a direct connection
D1 doesn't offer. For ad-hoc reads and writes, use wrangler:

```bash
cd website && npx wrangler d1 execute pzzlr --local --command "select id, name, mode from game_config;"
```

**The local database lives in
`website/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`, not in
`website/local.db`.** That `local.db` is a leftover from the pre-D1 libsql
setup and nothing reads it — a row inserted there with `sqlite3` is invisible
to the dev server, which shows up as a 404 on a game you can plainly see in
the table. Use `wrangler d1 execute --local`, or point `sqlite3` at the
miniflare file if you want a raw shell (there may be more than one `.sqlite`
there, one per `database_id` this repo has used — the current one is
whichever `wrangler d1 execute` agrees with).

`src/lib/server/db/auth.schema.ts` is generated from `better-auth`'s config
in `src/lib/server/auth.ts` and checked in; there is no npm script for it
anymore, so regenerate it with better-auth's own CLI if you change auth
plugins or config. Not a routine command.

## Two game modes

`game_config.mode` is `'ladder'` (default) or `'wordle'` — they don't share a puzzle shape, so each has its own daily/guess routes, and hitting the wrong one 400s with a pointer to the right one:

- **ladder**: `GET /api/games/:id/daily`, guesses checked via `POST /api/games/:id/guess` (adjacency only, but game-scoped — it looks up the game's own `length`/`dictionarySize` so a smaller-dictionary game actually rejects words that only exist in a larger tier). Engine: `ladder.ts` (`pickDailyPuzzle`). There is no generic `/api/ladder/*` anymore — that legacy, game-unaware namespace was removed since nothing in the app could correctly use it once dictionary size became per-game.
- **wordle**: `GET /api/games/:id/wordle/daily` (never includes the secret — see below), `POST /api/games/:id/wordle/guess`, `GET /api/games/:id/wordle/reveal` (for after a loss). Engine: `wordle.ts` (`pickDailyWord`, `scoreGuess`, `isWin`).

Both share the same seeded-daily-puzzle machinery in `daily-seed.ts` (`dailyRandom`, `puzzleNumberFor`), so a game's puzzle is always deterministic from `(date, target)` or `(date, seedKey)` — no per-day row stored in the DB for either mode.

For wordle specifically: the secret is checked server-side only. `wordle/daily` deliberately omits `target` from its response, and `wordle/guess` returns per-letter `result` (echoing the guessed letters back with correct/present/absent) rather than ever sending the secret itself — don't add a `target` field to a wordle response without a reason, since that's the one thing that isn't supposed to reach the client until the player has already guessed it.

Guesses and reveals are also tracked server-side per `(game, date, token)` — see `wordle-attempts.ts` and the `wordleAttempt` table. `token` is a client-minted id (not a login — the SDK widget plays anonymously), required on `wordle/guess` and `wordle/reveal`; without it neither route knows whose attempt it's scoring. `reveal` 403s until that token's attempt is actually solved or out of guesses — it's not just a "give up" convenience endpoint anymore, so don't call it to peek at a secret before playing it out. `wordle/daily?token=...` resumes an in-progress attempt (recomputed from the stored guesses, not persisted pre-scored) — useful if you're debugging why a reload didn't pick up prior guesses.

## Smoke-testing a game's daily puzzle

Every game's "puzzle of the day" is generated on the fly, seeded from `(date, target)` (or `(date, seedKey)` in daily-target mode) — see `pickDailyPuzzle`/`pickDailyWord`. There's no stored per-day puzzle to inspect in the DB; hit the API instead, against the running dev server:

```bash
curl -s http://localhost:5173/api/games/demo/daily | python3 -m json.tool
```

Swap `demo` for another game's id (from `game_config.id` — the `wrangler d1 execute` query above is the easiest way to look one up). Add `?date=YYYY-MM-DD` to preview a different day without waiting for it — this only overrides the date used for seeding, not `minSteps`/`rungsGiven`/`target`, which always come from the stored game config (see the comment on that route) so "today's puzzle" means the same thing for every player.

Response fields worth checking: `start`/`target` (the puzzle's two ends), `revealedRungs` (free words after `start`, length = the game's `rungsGiven`), `minSteps` (optimal path length, start through target inclusive), `puzzleNumber` (days since the epoch in `pickDailyPuzzle`, for display like "#370"). A 404 with a "could not generate a puzzle" message usually means `minSteps`/`rungsGiven` is too strict for that word length's graph — see `assertDailySolvable` in `game-input.ts`, which is meant to catch this at game-creation time instead.

To confirm the seed actually varies day to day for a given game (rather than trusting it blindly), diff two dates:

```bash
curl -s "http://localhost:5173/api/games/demo/daily?date=2026-08-20" | python3 -m json.tool
curl -s "http://localhost:5173/api/games/demo/daily?date=2026-08-21" | python3 -m json.tool
```

For a `wordle`-mode game, the daily route won't hand you the secret to eyeball, and `reveal` won't either until that token's attempt is actually over — so exhaust the game's `maxGuesses` first (a wrong guess is fine, it just has to be a real dictionary word), *then* reveal:

```bash
TOKEN=debug-token-1  # any string — this is what ties guesses together into one attempt
curl -s "http://localhost:5173/api/games/<id>/wordle/daily?token=$TOKEN" | python3 -m json.tool   # no target in here

curl -s -X POST "http://localhost:5173/api/games/<id>/wordle/guess" \
  -H 'content-type: application/json' -d "{\"guess\":\"crane\",\"token\":\"$TOKEN\"}" | python3 -m json.tool
# repeat with different real words until you've made maxGuesses guesses (or you win) — the
# response doesn't echo a running count, so track it yourself against the game's maxGuesses

curl -s "http://localhost:5173/api/games/<id>/wordle/reveal?token=$TOKEN" | python3 -m json.tool  # { "target": "..." }
```

## Visually QA-ing a scenario that needs a specific/rare game, without logging in

`/create` and the "Manage this game" panel on `/g/[id]` require a signed-in session, and creating an account or signing in isn't something to do just to poke at the UI. For visual QA of a specific scenario — a particular word length, dictionary size, or mode that doesn't happen to already exist among the current games — insert a throwaway row directly into `game_config`, view it at `/g/<id>` (game pages themselves don't require auth for public games), then delete the row:

```bash
cd website && npx wrangler d1 execute pzzlr --local --command "insert into game_config (id, name, mode, target, length, dictionary_size, min_steps, rungs_given, max_guesses, public, created_at) values ('qa-probe', 'QA probe', 'ladder', 'blustery', 8, 50, 4, 1, 6, 1, unixepoch()*1000);"
# ... view http://localhost:5173/g/qa-probe, screenshot, etc ...
cd website && npx wrangler d1 execute pzzlr --local --command "delete from game_config where id = 'qa-probe';"
```

Before reaching for a throwaway row, check what's already there — the local
database usually carries one game per mode (`demo` for ladder, plus
`wordle-test`, `quordle-test`, `absurdle-test`), which is enough for anything
that just needs "each mode's board on screen".

This is exactly how the length-8 board and both widgets' mobile layout got verified (a length-3–7 game never exercises the tightest cases). Pick a real dictionary word for `target` — it has to actually exist in that length/size's graph, or the widget's daily route 404s.
