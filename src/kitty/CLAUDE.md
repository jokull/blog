# Kitty Theme Builder

A visual editor and community browser for [Kitty terminal](https://sw.kovidgoyal.net/kitty/)
colour themes. Colours are edited in **OKLCH** (perceptually uniform: L, C and
H move independently), stored as JSON in D1, and shared as `.conf` exports.

## Stack

- **TanStack Start** (SSR + file routes) on Cloudflare Workers
- **Cloudflare D1** + Drizzle ORM (`kitty_theme` table in `/schema.ts`)
- **result-rpc** for the whole data layer — see below
- **Intent UI** (react-aria-components), Tailwind v4
- GitHub OAuth + iron-session (`/auth.ts`), admin is the `jokull` account

## The data layer

Every read and write goes through one result-rpc contract. There are no server
actions and no `revalidatePath`.

```
colors.ts     the palette codec — imported by BOTH schema.ts and models.ts,
              so the D1 column type and the wire type cannot drift
errors.ts     declared failures: auth/required, theme/*, community/*
layers.ts     SessionLayer (viewer | null) refined into ViewerLayer (viewer)
models.ts     KittyThemeModel — the entity, keyed by id
contract.ts   procedure shapes. BROWSER-SAFE. No handlers.
rpc-server.ts handlers, router, /api/rpc mount. SERVER-ONLY.
rpc-client.ts createBrowserClient built from the contract
shells.ts     the shell onion
ssr.ts        createServerFn prefetchers — the wall for isomorphic loaders
```

### The one rule that is a security bug if broken

result-rpc ships a **real value** to the browser, not just a type. So:

> Build the browser client from `contract.ts`, and never let anything a
> browser bundles import `rpc-server.ts`.

Its only legitimate importers are `src/routes/api/rpc.ts`, `ssr.ts`, and the
OG/SEO server routes. TanStack Start loaders are **isomorphic** — they run in
the browser on client-side navigation — so a loader must call a
`createServerFn` from `ssr.ts` rather than importing the server module. There
is no `'use client'` directive protecting you here.

Verify after `bun run build`:

```bash
grep -rl "iron-session\|drizzle-orm/d1\|cloudflare:workers\|getIronSession" dist/client/
# must print nothing
```

### Errors are values, not throws

Handlers `return err(errors.notFound({ themeId }))`. Nothing throws for an
anticipated outcome; an actual exception becomes a sanitized `server/internal`
with an incident id in the Worker log.

Note the deliberate split between `auth/required` (you are signed out — the
shell redirects you) and `theme/not-owner` (you are signed in, but it is not
yours — the component says so). Collapsing them would hand a 403 to a shell
whose only move is a login redirect.

`theme/not-found` covers both "no such row" and "unpublished and not yours",
because distinguishing them would disclose existence.

### Shells own failure classes

```
BoundaryProvider   transport pauses · defects escalate · stale reloads
  SessionShell     provides viewer: Viewer | null, claims nothing
    SignInShell    claims auth/required, reacts with the OAuth redirect
```

Mounted in `src/routes/kitty.route.tsx`. Because `SignInShell` claims
`auth/required`, components use `SignInShell.useQuery` / `.useMutation` and the
tag is _subtracted from the union_ — a call site cannot branch on "signed out",
and does not need an `if (!viewer)` guard before mutating.

Consequence: `mutate()` rejects with a **control signal** when a shell claims
the outcome. Use `dispatch()` from `shells.ts` for fire-and-forget calls; it
swallows `claimed` and `cancelled` and surfaces anything else.

### Entities do the invalidation

`KittyThemeModel` is keyed by `id`, and every mutation returns the entity, so
the cache patches the detail view and every sidebar row in place with no
refetch. Only _membership_ needs declaring, via `.affects()` in the contract —
publishing changes which list a theme belongs to; renaming does not.

`themes.remove` cannot return a deleted row, so it calls `touch(KittyThemeModel, id)`
to invalidate by identity instead.

Saving and publishing are optimistic via `cache.updateEntity`, with the
returned rollback applied in `onFailure`/`onCancel`.

### SSR

`kitty.route.tsx`'s loader prefetches the session and both sidebar lists; each
child route prefetches only what it owns. Every payload merges into one client
runtime through nested `ResultRpcHydrationBoundary`. Failed prefetches are
deliberately **not** dehydrated — a signed-out `themes.mine` costs nothing and
ships nothing.

## Types

- `SavedTheme` (models.ts) — a persisted row. `id: number`.
- `ThemeView` (lib/types.ts) — what the editor renders, including things that
  were never saved (a community import, the default palette). `id: number | null`.

Keep them distinct. The old code used one interface with a nullable id for
both, which is why the editor was full of `currentTheme.id!`.

## Adding a 22nd colour

1. `colors.ts` — add to `ThemeColorsCodec` (this updates the D1 column type too)
2. `lib/types.ts` — add to `colorLabels` and the `colorKeys` set
3. `lib/default-theme.ts` — add to `defaultThemeColors`
4. `components/color-selector.tsx` — add to a group
5. `components/editor-toolbar.tsx` — add to the exported `.conf`

## Commands

```bash
bun dev                      # vite dev
bun run build                # vite build + tsc --noEmit
bun run format-and-lint:fix
bun run generate:migration   # after editing schema.ts
```
