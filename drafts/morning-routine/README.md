# A morning routine made with Codex

- Slug: `morning-routine-codex`
- Category: `coding`
- Locale: `en`
- Status: draft in the blog API; `post.md` is the editable source.
- Hero: `/blog/morning-routine/week.webp`
- Downloadable prompt: `/blog/morning-routine/recreate-with-codex.txt`

The three WebP images are real app screenshots composed in `screenshot-framing.html`. Captured September 8, 2026, using a separate localhost origin with staged breakfast choices, Monday progress, and Pokémon/hairpin reward highlights. No original family photos are embedded.

Framing source expects raw `week.png`, `tray.png`, `lane.png`, `day.png`, `rewards.png` and a copy of the blog's `InterVariable.woff2` named `Inter.woff2` beside it. Open with `?view=week`, `?view=editor`, or `?view=daily`; capture at 1600 × 1660, 1600 × 1050, and 1600 × 1390 respectively. Raw captures are temporary local working files, not deployed assets.

The prompt in `post.md` must match the downloadable text file. Publishing is a separate CLI operation after reviewing the draft:

```sh
bun run blog update morning-routine-codex --publish
```
