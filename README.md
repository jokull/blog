# solberg.is

Source for [solberg.is](https://www.solberg.is), my personal blog and projects page.

The site includes the public blog, an authenticated Markdown editor and admin area, a CLI for
managing posts, and the [Kitty](https://www.solberg.is/kitty) terminal-theme editor.

## Stack

- [TanStack Start](https://tanstack.com/start) with React Server Components and React 19
- [Vite](https://vite.dev) and the Cloudflare Vite plugin
- [Cloudflare Workers](https://workers.cloudflare.com) and
  [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Drizzle ORM](https://orm.drizzle.team) for the SQLite schema and migrations
- Markdown and MDX rendered with `safe-mdx`, with server-side Shiki highlighting
- Monaco for post editing
- Tailwind CSS v4
- Hono for the authenticated blog API
- Bun, TypeScript, oxlint, and oxfmt

## Local development

Install dependencies and start Vite:

```sh
bun install
bun run dev
```

Local configuration lives in `.env`, which is ignored by Git. The application expects:

```dotenv
NODE_ENV=development
SITE_URL=http://localhost:5173
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
ONEDOLLARSTATS_API_KEY=...
```

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

After changing [schema.ts](./schema.ts), generate and inspect a new migration:

```sh
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
Hono API.

It targets the Vite development server at `http://localhost:5173` by default. Set `BLOG_API_URL`
if Vite chooses another port, or use the production shortcut:

```sh
bun run blog:prod login
bun run blog:prod list
bun run blog:prod get how-i-use-claude-code
```

Login uses GitHub's device flow and stores the resulting app token in `~/.blog-cli-session`.

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

- [`src/routes`](./src/routes) — TanStack Start file routes and API endpoints
- [`app`](./app) — shared page, layout, editor, and admin components rendered by the current routes
- [`cli`](./cli) — authenticated blog CLI and GitHub device-flow login
- [`lib/api.ts`](./lib/api.ts) — Hono post, note, category, and CLI-auth API
- [`schema.ts`](./schema.ts) and [`migrations`](./migrations) — D1 schema and forward migrations
- [`src/kitty`](./src/kitty) — Kitty theme editor, parser, gallery, and RPC implementation
- [`components`](./components) — shared UI and data visualizations
