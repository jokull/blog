/**
 * Comment bodies, rendered to HTML on the server.
 *
 * The server renders every comment and the wire carries `contentHtml`, so a
 * reader who scrolls to a thread downloads no markdown parser, no highlighter
 * and no chart components to display a paragraph of text. Nothing in this file
 * may be imported from the browser graph — `rpc-server.ts` is the only caller.
 *
 * Why not the site's own MDX pipeline: posts are written by me and may use JSX
 * components; comments are written by strangers and may not. `@tanstack/markdown`
 * is the right tool precisely because it *cannot* do MDX. Its parser has no raw
 * HTML node — `<script>alert(1)</script>` comes out as escaped text — and it
 * allowlists URL schemes, so `[x](javascript:alert(1))` renders as the bare word
 * `x` with no anchor at all. That makes the output safe to inject directly,
 * which is what `CommentBody` does with it.
 *
 * `@tanstack/highlight` stands in for shiki here for one decisive reason: it is a
 * synchronous regex tokenizer with no WASM and no async init. Shiki's grammar
 * load costs a second or more on a cold Worker isolate, which is a bad trade for
 * a code fence in a comment. It emits `th-*` classes rather than inline styles,
 * so `app/globals.css` maps them onto the same `--shiki-token-*` variables the
 * post renderer already uses and comment code looks like post code.
 */
import { createHighlighter } from "@tanstack/highlight/core";
import { css } from "@tanstack/highlight/languages/css";
import { diff } from "@tanstack/highlight/languages/diff";
import { html } from "@tanstack/highlight/languages/html";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { jsx } from "@tanstack/highlight/languages/jsx";
import { markdown } from "@tanstack/highlight/languages/markdown";
import { python } from "@tanstack/highlight/languages/python";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { ts } from "@tanstack/highlight/languages/ts";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";
import { renderHtml } from "@tanstack/markdown/html";

/**
 * The language set `mdx-components.tsx` registers with shiki, plus `diff`.
 *
 * `ts`, `tsx`, `js` and `jsx` are four separate grammars here with no aliasing
 * between them — registering only `tsx` leaves a ```ts fence completely
 * untokenized rather than falling back to a near-enough grammar. An unregistered
 * language is not an error, it just renders as plain text, which is the right
 * outcome for the long tail but a silent one, so the common four are all listed.
 * Each language's own aliases do work: `ts` covers `typescript`, `shell` covers
 * `bash`/`sh`/`zsh`, `markdown` covers `md`, and so on.
 *
 * Module scope is safe: construction is a plain object build with no I/O, so
 * this costs nothing at isolate startup — the whole point of picking this over
 * shiki.
 */
const highlighter = createTanStackMarkdownHighlighter(
	createHighlighter({
		languages: [ts, tsx, js, jsx, shell, json, html, css, python, sql, markdown, diff],
	}),
);

/** Markdown in, sanitised HTML out. Safe to inject; see the note above. */
export function renderCommentHtml(markdown: string): string {
	return renderHtml(markdown, { highlighter });
}
