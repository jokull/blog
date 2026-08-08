# CLAUDE.md

Footguns and conventions only. Commands are in `package.json`, the stack is in
its dependencies, and the module layout is legible from `src/rpc/` — none of
that is repeated here.

## Dependencies

`bun update --latest` **downgrades Drizzle to 0.x**. Drizzle publishes 1.0 only
under the `rc`/`beta` dist-tags, so npm `latest` is still `0.45.2` (orm) /
`0.31.10` (kit). Both are pinned to exact `1.0.0-rc.4`; re-pin after any bulk
update.

## Environment

Server code reads bindings from `import { env } from "cloudflare:workers"`, and
nothing else. That import is unresolvable in the client graph, so reaching for a
secret from browser code is a build error rather than a silent `undefined`.

There is no `NODE_ENV` — use `import.meta.env.DEV`, which Vite constant-folds so
dev-only routes are dead code in the production bundle.

Secrets are deliberately **not** declared in `wrangler.jsonc`. Wrangler reads
them from `.env` locally and `wrangler secret put` in production, and
`npx wrangler types` writes them into `Env` as required keys — that generated
file is the compile-time check. Never hand-edit it; regenerate after touching
`wrangler.jsonc`.

Side effect of that generation: every binding is also declared a **required**
`NodeJS.ProcessEnv` key. True inside the Worker, false in `cli/`, which runs on
plain Bun — so a `??` fallback there is correct even though the type says it is
unreachable.

## RPC

**Build the browser client from the contract, never the router.** result-rpc
ships a real runtime value to the browser, so importing the router from client
code drags D1, iron-session and the GitHub client secret into the bundle. This is
a security bug, not a size regression. After `bun run build`:

```bash
rg -l 'iron-session|kysely-d1|cloudflare:workers|GITHUB_CLIENT_SECRET' dist/client/
# must print nothing
```

`Register` has a single global slot, so there is exactly one contract, one router
and one client. A second browser client silently shadows the first.

`pickErrors` returns a plain object keyed by the short name, so
`{...pickErrors(postErrors, "notFound"), ...pickErrors(categoryErrors, "notFound")}`
**silently drops one**. Give the second an explicit distinct key.

Keep failures as values as far as possible. The CLI's single unwrap point is
`expect()` in `cli/blog.ts`, backed by the exhaustive `errorCatalog` in
`cli/failures.ts`; adding an error to a contract should break that build rather
than degrade into an unexplained exit code. Don't reintroduce stringly `explain()`
helpers.

### Provider placement

`__root.tsx` owns transport only — `ResultRpcProvider` + `BoundaryProvider`.
Identity mounts per subtree (`admin.tsx`, `kitty.route.tsx`, `comments.tsx`) as
`SessionShell` → `SignInShell` → `AdminShell`. Two rules hold that shape:

- **`SessionShell` must not move to the root.** Its provider issues a `session`
  query on mount and renders its fallback until that succeeds, so at the root it
  puts a blocking round trip in front of every public page.
- **`AdminShell` stays scoped.** It subtracts `auth/forbidden` from every union
  beneath it, so mounting it over kitty makes cases in exhaustive switches
  unreachable and turns them into type errors.

Ordering is enforced at runtime: a shell throws if mounted outside its parent,
and two shells claiming the same tag throw at definition time.

## Markdown

Two renderers, and they must not converge:

- **Posts** — `safe-mdx` + `mdx-components.tsx`. Server-only. Posts are mine and
  may use JSX components.
- **Comments** — `@tanstack/markdown` + `@tanstack/highlight`, rendered server-side
  into `contentHtml`. Comments are stranger-authored, and this parser is chosen
  precisely because it _cannot_ do MDX: no raw-HTML node (tags come out escaped)
  and an allowlist on link schemes, so the output is sanitised by construction and
  safe to inject. `@tanstack/highlight` over shiki because it is a synchronous
  tokenizer with no WASM — shiki's grammar load is a bad trade on a cold isolate.
  Swapping either one re-opens an XSS hole.

Nothing in the browser graph may reach `safe-mdx`. If the client build starts
wanting `optimizeDeps` entries for `fault`/`format`/`extend`, something crossed
back over.

## Conventions

- `safeFetchJson` + `safeParse` from `lib/safe-utils` for external calls — typed
  `fetch/*` / `schema/*` errors, no throwing, no `any` assertions for oxlint's
  `no-unsafe-type-assertion` to flag.
- Results are better-result `Ok`/`Err` instances. Narrow with `isOk()`/`isErr()`
  before touching `.value`/`.error`; destructuring a Result does not typecheck.
  Prefer `isErr()` over `!isOk()` so there is one spelling.
- Everything comes from `result-rpc` — combinators, `tryCatch`/`tryPromise`,
  `InferErr`/`InferOk`. Nothing imports `better-result` directly even though it
  is the foundation and a required peer.
- `tryCatch`/`tryPromise` take better-result's object form,
  `tryPromise({ try, catch })`, where `catch` returns the tagged error.
- Inside `gen`, the body must **return a Result** — `return ok(x)`, not
  `return x`. A bare return picks the wrong overload, and the error surfaces on
  a later line as `Property 'then' does not exist on type 'Result$1<…>'`.
- `wire.nullable(X)` and `wire.enum([...])` both exist.
- `mutate()` returns **void** and never rejects. `mutateAsync()` returns the
  `Result` and rejects with the `cancelled`/`claimed` control signals. Event
  handlers call `mutate` bare; no wrapper.
- Anything Motion animates must be declared in `variants`/`animate`, **never** in
  `style` — a value passed through `style` is treated as externally owned and
  silently never animates.

## CLI

`.env` sets `BLOG_API_URL`, and Bun auto-loads it, so a bare `bun run blog`
targets **production**. Pass `BLOG_API_URL=http://localhost:5173` for dev.

A `client/protocol-violation` on every command means the deployed worker is
serving an older contract than the CLI was built against — deploy, don't debug.

`edit <slug>` opens the body in `$VISUAL`/`$EDITOR`; a non-zero exit (`:cq`)
abandons. There is no browser editor, and `posts.setPublished` is the single
publish implementation shared by the CLI and the dashboard switch.

## Writing posts

Only `h1` (title) and `h2` (sections) are styled distinctly — `h3`/`h4`/`h5`
render identically to `h2`, so deep nesting is unsupported by design. Avoid
faux-headers (bold text as a header); restructure or split the post instead.
Lists, blockquotes and code blocks carry the visual variety.

## Intent UI

Add: `npx shadcn@latest add @intentui/<name>`. Update: same with `-o`.
Docs: https://intentui.com/llms.txt
