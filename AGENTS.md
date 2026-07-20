# Repository guidance

## Package manager

This project uses Bun. Use `bun install` and keep `bun.lock` authoritative; do
not add pnpm lockfiles or workspace configuration.

## Build and deployment

- `bun run build` runs the production Vite build and TypeScript check.
- `bun run deploy` builds and publishes `solberg-blog` with Wrangler.
- Pushes to `main` are built by Cloudflare Workers Builds, not GitHub Actions.
  Check the commit status with:

    ```sh
    gh api "repos/jokull/blog/commits/$(git rev-parse HEAD)/check-runs" \
      --jq '.check_runs[] | {name, status, conclusion, details_url}'
    ```

Treat a `Workers Builds: solberg-blog` check with a `success` conclusion as the
CI deployment signal. A failed check means the prior production deployment
remains active; inspect its `details_url` before declaring the change deployed.
