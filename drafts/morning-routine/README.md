# A morning routine made with Codex

- Slug: `morning-routine-codex`
- Category: `coding`
- Locale: `en`
- Status: draft in the blog API; `post.md` is the editable source.
- Hero: `/blog/morning-routine/siblings-collage.webp`
- Downloadable prompt: `/blog/morning-routine/recreate-with-codex.txt`

The three current WebP images are promotional compositions generated with Codex's built-in image generation using the app's existing transparent sticker PNGs as references. They emphasize character, breakfast and reward details, rather than reproducing the full UI. Exact prompts and reference filenames are in `promotional-image-prompts.json`. No original family photos are embedded.

The earlier framed screenshots and `screenshot-framing.html` are retained as previous artwork; the article now uses `siblings-collage.webp`, `breakfast-detail.webp`, and `rewards-detail.webp`.

The prompt in `post.md` must match the downloadable text file. Publishing is a separate CLI operation after reviewing the draft:

```sh
bun run blog update morning-routine-codex --publish
```
