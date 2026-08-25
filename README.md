# solberg.is

Source for [solberg.is](https://www.solberg.is), my personal blog and projects page.

The site includes the public blog, an authenticated admin area for moderation and publishing, a Bun
CLI for managing and editing posts (in your own editor), and the [Kitty](https://www.solberg.is/kitty)
terminal-theme editor.

## Stack

- [TanStack Start](https://tanstack.com/start) with React Server Components and React 19, built with
  Vite via the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/) and
  deployed to [Cloudflare Workers](https://workers.cloudflare.com)
- [Cloudflare D1](https://developers.cloudflare.com/d1/) (binding `DB`) with a
  [Drizzle](https://orm.drizzle.team/) schema as the source of truth — it drives `drizzle-kit`
  migration generation, and `scripts/gen-db-types.ts` derives the
  [Kysely](https://kysely.dev) table types from it. Queries run through Kysely, wrapped in
  [`db-result`](https://www.npmjs.com/package/db-result)'s `kyselyTryDb` so failures are classified
  into Result tags and transient errors auto-retry.
- [result-rpc](https://result-rpc.com) — typed RPC contracts and routers for the blog, Kitty, CLI and
  admin APIs, with one wire-safe error union from the server to the component that handles it.
- Posts are authored as MDX and rendered with `safe-mdx` + Shiki (server-side). Comments are
  stranger-authored, so they render with `@tanstack/markdown` + `@tanstack/highlight` — a
  synchronous, WASM-free tokenizer chosen over Shiki's grammar load, sanitised by construction.
- Tailwind CSS v4, [arctic](https://arcticjs.dev) (GitHub OAuth), iron-session (admin sessions), and
  valibot (schema validation).
- Bun, TypeScript, oxlint, oxfmt, and Lefthook pre-commit hooks.

## Local development

Install dependencies and start Vite:

```sh
bun install
bun run dev
```

Local configuration lives in `.env` and `.env.local`, both ignored by Git. Vite and the Cloudflare
Vite plugin load them for the local Worker:

```dotenv
# .env
BLOG_API_URL=https://www.solberg.is

# .env.local
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

`SITE_URL` and `GITHUB_CLIENT_ID` are declared as `vars` in `wrangler.jsonc`; the secret
(`GITHUB_CLIENT_SECRET`) and any others (e.g. `ONEDOLLARSTATS_API_KEY`) are set in production with
`wrangler secret put`. There is no `NODE_ENV` — use `import.meta.env.DEV` for dev-only code.

The development app bypasses GitHub OAuth through `/api/dev-auth`, but still needs a sufficiently
long `GITHUB_CLIENT_SECRET` for the encrypted admin session. Use the URL printed by Vite if it
chooses a port other than 5173.

### Local D1 database

To initialize a fresh local D1 database, apply the checked-in migrations in timestamp order:

```sh
for migration in migrations/*/migration.sql; do
  bunx wrangler d1 execute solberg-blog --local --file "$migration"
done
```

After changing [schema.ts](./schema.ts), regenerate the Kysely types and inspect a new migration:

```sh
bun run gen:db-types
bun run generate:migration
```

Apply one generated migration locally:

```sh
bunx wrangler d1 execute solberg-blog \
  --local \
  --file migrations/<timestamp_name>/migration.sql
```

Apply it to production explicitly:

```sh
bunx wrangler d1 execute solberg-blog \
  --remote \
  --file migrations/<timestamp_name>/migration.sql \
  --yes
```

Production schema changes must land before application code that reads the new schema. D1 schema
work is not applied automatically by a Worker deployment.

## Blog CLI

The Bun CLI in [`cli/blog.ts`](./cli/blog.ts) manages posts and notes through the authenticated
[`result-rpc`](https://result-rpc.com) API.

It reads `BLOG_API_URL` from `.env`, which points at production, so a bare `bun run blog` is the
production shortcut. For local development, point it at the Vite server:

```sh
BLOG_API_URL=http://localhost:5173 bun run blog login
bun run blog:prod list
bun run blog:prod get how-i-use-claude-code
```

Login uses GitHub's device flow and stores the resulting app token in `~/.blog-cli-session`.

There is no browser editor — `edit <slug>` opens the post body in `$VISUAL`/`$EDITOR`, and a
non-zero exit (e.g. `:cq`) abandons the edit.

### Create a post

New posts are drafts unless `--publish` is supplied. The body can come from a file or stdin:

```sh
bun run blog:prod create \
  --slug my-post \
  --title "My Post" \
  --body-file - \
  --publish < post.md
```

Add `--dry-run` to inspect the post without creating it, or `--diff` to print the content before
creation.

### Safely edit a post

`get --json` returns the post and its ETag. Pass that ETag back with `--if-match` to avoid
overwriting an edit made after the post was fetched:

```sh
bun run blog:prod get my-post --json > /tmp/my-post.json
jq -r '.post.markdown' /tmp/my-post.json > /tmp/my-post.md

# Edit /tmp/my-post.md, then update only if the original revision is still current.
bun run blog:prod update my-post \
  --body-file /tmp/my-post.md \
  --if-match "$(jq -r '.etag' /tmp/my-post.json)" \
  --diff
```

Other useful forms:

```sh
# Print only Markdown, suitable for a pipe or redirect.
bun run blog:prod get my-post --body-only

# Preview metadata and Markdown changes without writing.
bun run blog:prod update my-post --body-file post.md --dry-run

# Publish or return a post to draft state.
bun run blog:prod update my-post --publish
bun run blog:prod update my-post --unpublish

# Back up every post to iCloud Documents on macOS.
bun run blog:prod backup
```

Run `bun run blog --help` for the complete command and option list.

## Checks

```sh
bun run test
bun run lint
bun run format:check
bun run build
```

`bun run build` runs the production Vite build and `tsc --noEmit`. Lefthook runs formatting and
type-aware linting before each commit.

## Deployment

Pushing `main` triggers Cloudflare Workers Builds. A successful
`Workers Builds: solberg-blog` check is the production deployment signal.

```sh
git push origin main

gh api "repos/jokull/blog/commits/$(git rev-parse HEAD)/check-runs" \
  --jq '.check_runs[] | {name, status, conclusion, details_url}'
```

A failed build leaves the previous production deployment active. Manual deployment is also
available:

```sh
bun run deploy
```

## Repository map

- [`src/routes`](./src/routes) — TanStack Start file routes: SSR pages, feed/sitemap/robots/llm.txt,
  dynamic OG images, and the `api/rpc` + `api/dev-auth` endpoints
- [`src/blog`](./src/blog) — blog RPC server, contracts, model decoding, and comment rendering
- [`src/kitty`](./src/kitty) — Kitty theme editor, parser, gallery, and RPC implementation
- [`app`](./app) — shared page, layout, and admin/dashboard components
- [`cli`](./cli) — authenticated blog CLI and GitHub device-flow login
- [`schema.ts`](./schema.ts), [`src/db`](./src/db), and [`migrations`](./migrations) — Drizzle schema,
  generated Kysely types, and forward migrations
- [`components`](./components) — shared UI and data visualizations
