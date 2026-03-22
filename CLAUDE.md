# CLAUDE.md

## Development Commands

- `bun dev` — vinext dev server
- `bun run build` — Vite build
- `bun run deploy` — build + `wrangler deploy`
- `bun run format-and-lint` (check) / `bun run format-and-lint:fix` (fix)
- `bun run generate:migration` — Drizzle migration, then `wrangler d1 execute solberg-blog --file <path>`

## Stack

- **vinext** (Vite + React Server Components on Cloudflare Workers)
- **Cloudflare D1** (SQLite) with Drizzle ORM
- **Hono** API routes
- **Tailwind CSS v4**, **Intent UI** (react-aria-components, via shadcn CLI)
- **oxlint + oxfmt** for linting/formatting (tab indentation, 100 char width)

## CLI Tool

Manage blog posts via `cli/blog.ts`:

```bash
bun run blog <command> [options]
```

By default the CLI hits `http://localhost:3000`. To run against production:

```bash
BLOG_API_URL="https://www.solberg.is" bun run blog <command>
# or use the shortcut:
bun run blog:prod <command>
```

**Commands:** `login`, `logout`, `whoami`, `list`, `get <slug>`, `create`, `update <slug>`, `delete <slug>`, `categories`, `backup`

**Common options:** `-s/--slug`, `-t/--title`, `-b/--body`, `-f/--body-file`, `-c/--category`, `-l/--locale` (`en`/`is`), `--hero-image`, `--publish`/`--unpublish`

Authentication uses GitHub OAuth — run `bun run blog login` first. Token stored in `~/.blog-cli-session`.

## Code Conventions

- Use `safeFetchJson` + `safeZodParse` from `lib/safe-utils` for external API calls — avoids `any` type assertions that oxlint flags (`no-unsafe-type-assertion`).

## Auth

GitHub OAuth + iron-session. Admin restricted to GitHub user `"jokull"`. In dev, protected routes auto-redirect to `/api/dev-auth`.

## Intent UI Components

Managed via shadcn CLI. Add: `npx shadcn@latest add @intentui/<name>`. Update: add `-o` flag. Docs: https://intentui.com/llms.txt
