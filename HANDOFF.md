# HANDOFF — tursopg experiment: driver proven, migration mapped

Branch `experiment/tursopg`. The blog's data layer runs against Turso's
Postgres frontend (`tursopg`, built from `tursodatabase/turso` @ main,
`postgres/cli`) over the PG wire protocol v3 — schema, queries, plugins,
type boundaries. 22/22 demo checks pass.

**Answer to the "fork kysely drivers?" question: no fork needed.** tursopg
speaks the PostgreSQL wire protocol (simple + extended, `$1` params, text
format), so Kysely's built-in `PostgresDialect` + node-postgres replaces
`kysely-d1`'s `D1Dialect`. The hybrid glue is three pg type-parser overrides,
one in-repo plugin fix, and two behavior decisions — all in this branch.

## How to run

```sh
# server (already running in tmux `tursopg-server` on :5433)
~/Code/turso/target/release/tursopg /tmp/tursopg-blog.db --server 127.0.0.1:5433
# probe with psql
psql "postgres://turso@127.0.0.1:5433/turso"
# the experiment
bun run scripts/tursopg-demo.ts
```

## Type mapping (deliberate, per review)

| D1 today                                                | tursopg             | rationale                                                                                                                                           |
| ------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_hidden` / `is_published` 0/1                        | `BOOLEAN`           | real booleans, not 0/1                                                                                                                              |
| `public_at` YYYY-MM-DD TEXT + GLOB CHECK                | `DATE`              | calendar date; tursopg validates input (`not-a-date` rejected) → CHECK retired                                                                      |
| `created_at`/`published_at`/`modified_at` epoch INTEGER | `TIMESTAMP` (no tz) | epoch is tz-free, app renders its own tz; no timestamptz. UTC wall clock: write `Date.toISOString()`, read `"YYYY-MM-DD HH:MM:SS"` re-parsed as UTC |
| ids AUTOINCREMENT                                       | `BIGSERIAL`         | maps to INT4 OID — pg returns number, no parser override needed                                                                                     |
| github ids, revision                                    | `INTEGER`           |                                                                                                                                                     |
| everything else                                         | `TEXT`              |                                                                                                                                                     |

## Driver behavior (the "curious what the driver does" answers)

- **DATE (OID 1082)** — tursopg sends `"2026-08-12"`; node-postgres' default
  parser returns a JS `Date` at **UTC midnight** (`2026-08-12T00:00:00.000Z`).
  `Temporal.PlainDate.from(Date)` throws, so the boundary overrides the parser
  to return the raw string — the plugin's ISO path then builds PlainDate
  unchanged. The override is load-bearing, not cosmetic.
- **TIMESTAMP (OID 1114)** — tursopg sends `"2026-08-12 10:00:00"` (second
  precision, space separator, no tz). pg's default parser reads tz-less as
  _local_ time; the boundary re-attaches `Z` (this machine is UTC+0 so the
  default coincidentally agrees — the override makes it deployment-proof).
- **BIGSERIAL → INT4 (23)**: ids come back as numbers with no override.
- **`count(*)` → OID 25 (TEXT)**: comes back as a string (`"1"`). The app's
  existing `Number(counted?.count ?? 0)` absorbs it; `cast(count(*) as
integer)` restores a real number portably.

## Is tursopg indistinguishable from standard PG? Mostly, not fully

From the driver/Kysely viewpoint the blog's whole surface works unchanged in
behavior. The measurable divergences:

1. **SQLSTATE is `XX000` for every error** — duplicate key and FK violation
   both come back `code: XX000` instead of `23505`/`23503`. `db-result/pg`'s
   `UniqueViolation.is(e)` / `ForeignKeyViolation.is(e)` match on SQLSTATE, so
   they never fire → `createPost`'s slugTaken/notFound mapping falls through to
   scenario C. Needs message-text classification or an upstream tursopg fix.
2. **FK enforcement is OFF by default** (D1 has it on) — orphan inserts
   succeed. `SET foreign_keys = ON` works (SET → PRAGMA passthrough) and, via
   the server's single shared connection, sticks for every client. One SET at
   startup restores the blog's guarantees.
3. **NULLS ordering keeps SQLite semantics** — `ORDER BY public_at DESC`
   still puts drafts (NULL) last, matching D1. Real PG would put them first.
   The blog's current queries work as-is; the portable form is
   `orderBy("public_at", (ob) => ob.desc().nullsLast())` (also used here).
4. **No auth** (NoopHandler), **one shared connection** (no real concurrency;
   BEGIN/COMMIT from one client affects all), second-precision timestamps,
   text-format binding only, COPY / PREPARE / real EXPLAIN missing.
5. `count(*)` as TEXT (above) — a driver that switches on OIDs sees it.

## Migration changes in this branch (all in-repo, no forks)

1. `lib/plain-date-plugin.ts` — two changes:
    - stringify insert-value cells (Kysely 0.29 packs insert values as raw
      cells in `PrimitiveValueListNode`; D1's binding coerced PlainDate via
      `toJSON()`, node-postgres sends the JSON string with quotes).
    - **PG-only read boundary**: result side maps the driver's JS Date (OID
      1082 = UTC midnight) → `Temporal.PlainDate` from UTC components. The
      D1 TEXT/string arm is gone by design — one representation, the DATE
      column. The 1082 parser override is therefore NOT needed (removed from
      the demo); DATE needs no driver glue, the plugin is the boundary.
2. `scripts/tursopg-demo.ts` — the proof: schema as PG DDL, every app query
   shape, plain-date boundary, booleans, FK + CHECK + type-level validation,
   NULLS ordering, count casts. Defines the future `db-types` boundary
   (`TursopgDB`): `Date` for TIMESTAMP columns, `boolean` for 0/1,
   `Temporal.PlainDate` for public_at.
3. `package.json` — `pg@8.23` + `@types/pg` as devDependencies (experiment).

## What the real move still needs (next steps)

- **Migrations**: all 13 drizzle SQLite migrations fail to parse (backticks,
  `PRAGMA`, `typeof`, `date(...,'unixepoch')`, `GLOB`, `__new_post` rebuild).
  The move is fresh PG DDL (the demo's `DDL` block) + one data import that
  transforms epoch→TIMESTAMP and 0/1→BOOLEAN (export D1 → transform → load).
- **Error classification**: `UniqueViolation.is`/`ForeignKeyViolation.is`
  need a tursopg-aware adapter (message match) until tursopg emits real
  SQLSTATEs — or upstream the SQLSTATE fix.
- **db.ts swap**: `D1Dialect({ database: env.DB })` →
  `PostgresDialect({ pool })` + the three parser overrides + `SET
foreign_keys = ON` on startup; `db-result/sqlite` → `db-result/pg`.
- **Boundary regeneration**: `gen-db-types.ts` + schema.ts move to the
  `TursopgDB` shapes; `epoch()` helpers become Date writes; boolean literals
  replace `1`/`0` in kitty queries; decode functions drop epoch math.
- **Deployment shape**: tursopg is a local server; Workers can't reach a
  local TCP socket. The realistic tursopg target is the CLI/local-first path
  (or a hosted tursopg later) — the experiment intentionally proves the data
  layer, not the Workers hosting story.

## Workerd socket verdict (spiked 2026-08-12)

Sockets DO work from workerd to a local tursopg — the spike rendered a real
post from tursopg through the dev server (request 1, fresh socket). What
fails is **cross-request pooling**, driver-independently:

- postgres.js: clean error — "Cannot perform I/O on behalf of a different
  request" (socket created in one request handler, reused in another).
- `pg`: worse — the request **hangs** ("The Workers runtime canceled this
  request… code had hung") because the pool hands the next request a dead
  socket and never completes.

Conclusion: a module-scope pooled connection cannot live inside workerd.
The only in-Worker pattern is a **per-request connection** — which is now
LANDED: `db.ts` exports `createDb()`/`withDb()`; rpc procedures use
`context.db` (per-request via `createContext`); route loaders and RSC pages
wrap in `withDb`. Verified in workerd: 6 sequential requests across /,
/tursopg-spike and /notes — all 200, correct data (byline "August 12, 2026"
through the DATE boundary), zero hangs or I/O-lifetime errors in the log.

Wire-level conversion keeps the app's D1-shaped boundary (generated types:
epoch numbers, 0/1) while columns are TIMESTAMP/BOOLEAN/DATE:
`setTypeParser(1114 → epoch seconds)`, `setTypeParser(16 → 0|1)`, `(20 →
number)`. DATE needs no override — the plugin's Date arm owns it. The
Date/boolean boundary flip in generated types + decodes remains pending.

Known remaining gaps (documented, not fixed):

- ~~SQLSTATE XX000~~ — **FIXED upstream** (see above).
- rpc `createContext` doesn't explicitly destroy its pool — workerd reaps
  it per request (experiment-grade; `withDb` does destroy).
- `count(*)` comes back as TEXT string; app's `Number()` absorbs it.
- The rpc context per-request pool is created even for queries that never
  run (e.g. session-only calls) — fine at this scale.
- **Date/boolean boundary flip — DONE** (commit 62f77b0).
- **Home post list "not rendering" — WAS DATA, not code**: the tursopg db
  file got replaced by a fresh empty file (4096 bytes) when the rebuilt
  tursopg binary took over the :5433 hub process; the re-seeded posts also
  had NULL category_slug + no categories, and PostList filters by the
  default "coding" category — so the list was legitimately empty. Root
  cause of the `{isNotFound: true}` stream errors: the dev server renders
  the `[slug]` route, whose `getPost(undefined)` → `throw notFound()`
  (correct app behavior on a missing row; harmless to the home render).
- **D1→tursopg migration — DONE**: `scripts/migrate-d1-to-tursopg.ts`
  (epoch→TIMESTAMP UTC, 0/1→BOOLEAN, text date→DATE, wipe child-first for
  FK order, reads via sqlite3 CLI because bun:sqlite CANTOPENs the
  miniflare file). Migrated the real dev-D1 data: 93 posts, 3 categories,
  10 comments, 1 kitty_theme. Home + detail pages render real posts on
  :5174. TanStack trio bumped (router 1.170.27, start 1.168.44, core
  1.171.22) + vite 8.2.1; `.vite`/`node_modules` nuked per user — no
  behavior change.

## 2026-08-12 afternoon findings

- **RSC boundary (fixed, real on main too)**: the home page spread
  `...post` (the full StoredPost, incl. `publicAt: Temporal.PlainDate`) into
  `<PostList>` client props. RSC can't serialize Temporal.PlainDate —
  "Only plain objects can be passed to Client Components". Dev-mode D1
  (:5173) 500s on the same page; prod's Flight build reduces the instance
  to its ISO string (verified in the deployed payload: `"publicAt":
"2026-05-20"`), masking it. Fix: the boundary degrades PlainDate →
  **Date at UTC midnight** (Flight's native Date encoding — verified in the
  wire as `$D2026-08-12T00:00:00.000Z`) and PostList's `Post` contract
  carries `publicAt: Date`, formatted client-side with
  `timeZone: "UTC"` — local-time formatting shifts the day on
  negative-offset machines ("Aug 12" in UTC, "Aug 11" in America/Los_Angeles
  — empirically confirmed). Markdown stays server-side. Grep confirms no
  other `{...model}` spreads into client components. React Temporal support
  is tracked in facebook/react#34142 (open, unconfirmed, no team response)
  and named as the reopen trigger in #25687 — devalue (result-rpc's wire)
  already carries Temporal natively.
- **tursopg is crash-prone under parallel clients**: the pre-#8191
  shared-connection server panics (`core/storage/wal.rs:414` — "unlock
  called with no readers or writers") under concurrent wire clients, which
  a browser produces naturally. When it dies, requests fall through to
  OrbStack's Postgres on `*:5433` (SASL errors) — the "doesn't load
  smoothly" symptom. Now managed by hub with `restart: on-failure`
  (auto-recovery in ~1s); the durable fix is upstream PR #8191.
- **tursopg crashed under concurrent clients**: `panicked at
core/storage/wal.rs:414:13: unlock called with no readers or writers`
  (SIGABRT) while the dev server's per-request pools hit the pre-#8191
  shared-connection server. Evidence for PR #8191 (per-client connections +
  blocking pool). Restart tursopg after a crash:
  `~/Code/turso/target/release/tursopg /tmp/tursopg-blog.db --server 127.0.0.1:5433`
- **OrbStack shadows 5433**: a Postgres in OrbStack listens on `*:5433`;
  tursopg's specific `127.0.0.1:5433` bind masked it until tursopg died,
  after which the dev server hit a REAL Postgres (SASL auth error). The
  tursopg URL is explicitly 127.0.0.1 — fine while tursopg lives.

## The Turso PG connection story (as of 2026-08-12)

- **Server**: real wire-protocol server in-tree (`postgres/server`, pgwire);
  proven working from psql, pg, and postgres.js.
- **PR #8191 (open)**: per-client connections (each socket gets its own
  connection; abandoned transactions rolled back on disconnect) + real
  transaction status in ReadyForQuery + blocking-pool execution with
  `--busy-timeout` (default 5000ms). This obsoletes this experiment's
  shared-connection findings: SET foreign_keys = ON becomes per-connection
  again, and the app must run it per connection. Documented divergences from
  real PG: database-wide write lock → 55P03 after busy timeout; snapshot
  isolation (~REPEATABLE READ), stale writes fail with 40001; no
  aborted-transaction state.
- **Not yet**: no published packages, no hosted offering, no WASM build for
  the PG frontend (the blog post's browser/embedded vision is ahead of the
  tree — `postgres/` has no wasm targets).

## Driver choice: `pg` vs `postgres.js` (both proven against tursopg)

Both drivers work over the wire — including postgres.js's default **binary**
result format (pgwire encodes it correctly). Differences that decide the pick:

- **`pg` (node-postgres)** — first-party Kysely `PostgresDialect`; the three
  parser overrides in the demo (DATE→string, TIMESTAMP→UTC Date, INT8→number).
  Wrong shape for Cloudflare Workers (node:net/streams).
- **`postgres.js` (`postgres`)** — no dialect in kysely 0.29; needs community
  `kysely-postgres-js@3` (peer: kysely >=0.24 <1 — compatible). Its own type
  parsers: DATE also arrives as a JS Date (UTC midnight) so the plugin path
  needs a postgres.js `types.date` override to return the ISO string;
  TIMESTAMP arrives UTC-correct **without** an override (pg needed one); int8
  and count(*) come back as string just like pg. Documented Cloudflare
  Workers support (`cloudflare:sockets`) — the driver for the day tursopg is
  hosted and the Worker connects outbound.

Recommendation: keep `pg` for the local move (first-party dialect, overrides
already proven in `scripts/tursopg-demo.ts`); revisit postgres.js when the
hosting story exists. The XX000 error-classification and FK findings apply to
both identically.

## Rollback

Delete branch `experiment/tursopg`; `lib/plain-date-plugin.ts` reverts to the
D1-masked state (behaviorally identical on D1). Server: `tmux kill-session
tursopg-server` / `tursopg-build`.

## 2026-08-12 afternoon — dev-server optimizer cascade: root cause + fix

**Symptom**: dev server (TanStack Start + vite 8 rolldown + @cloudflare/vite-plugin)
spent minutes in "optimized dependencies changed" → reload → recompile loops on
first request; CPU burn, requests hang (worst on this branch with pg in the graph).

**Root cause** (source-verified): the plugin forces discovery on — its dev
environment config sets `optimizeDeps.noDiscovery: false` and its resolver calls
`depsOptimizer.registerMissingImport()` for every unresolved import
(`node_modules/@cloudflare/vite-plugin/dist/index.mjs` ~65420). The rsc
environment's optimizer then discovers node_modules imports ONE PASS AT A TIME;
each pass prebundles a batch, triggers a reload, and the next request discovers
more. TanStack's subpath imports (`@tanstack/router-core/isServer`,
`@tanstack/start-server-core/createServerRpc`, …) each cost a pass — dozens of
routes → multi-minute cascade. pg was a red herring (its subtree just adds more
passes).

**Fix** (`vite.config.ts`, commit f0b85cf): prebundle at startup via
`optimizeDeps.include` in the rsc + ssr environments:

- TanStack subpaths: `@tanstack/start-server-core/createServerRpc`,
  `@tanstack/router-core`, `@tanstack/router-core/isServer`,
  `@tanstack/router-core/ssr/server`, `@tanstack/start-client-core`,
  `@tanstack/start-storage-context`, `@tanstack/history`
- RSC payload deps: `devalue`, `seroval`, `h3-v2`, `temporal-polyfill/global`
- pg's full transitive closure (from the installed tree): pg, pg-pool,
  pg-protocol, pg-types, pgpass, pg-connection-string, pg-int8, pg-cloudflare,
  postgres-array, postgres-bytea, postgres-date, postgres-interval, split2,
  xtend

**Bisect evidence** (minimal repro in /tmp/start-bisect — TanStack start-basic
example, vite 8.2.0 pinned, cloudflare plugin 1.49.0):

- baseline (no plugins): home 200 in 1.8s, 0 reloads
-   - cloudflare plugin: 404 fast, 0 reloads
-   - rsc: 200 in 0.8s, 0 reloads
-   - pg server fn (module-scope pool): 200 in 3.1s, **3 reloads** (all rsc env,
      all TanStack subpaths — not pg)
-   - subpath includes: **0 reloads**, 200 in 1.6s with the blog's per-request
      pool pattern; module-scope pool → workerd hang-timeout 500 (the original
      reason createDb became per-request — independently reproduced)

**Dead ends (documented so nobody retries)**: `optimizeDeps.disabled` → plugin
asserts "depsOptimizer is required in dev mode". `noDiscovery: true` → ignored
(plugin forces false). Excluding pg → workerd statically resolves its optional
`require('pg-native')` → "Could not resolve pg-native"; a stub alias then hit
ESM-interop crashes ("module is not defined", "reading 'Client'") — the
prebundler tolerates the optional require, discovery/exclusion does not.
`disabled: "dev"` on vite's own config is not the answer.

**Operational note**: the user's dev server (PID 16146) listens on 5173 AND
5175-5177; never curl/use those ports for experiments (first bisect runs hit it
and "hung" — was serving a D1 cold request).

**Main branch**: the cascade exists on main too (TanStack subpaths, no pg).
Port the TanStack subpath + payload deps include (skip the pg entries) when
next touching main's vite.config.
