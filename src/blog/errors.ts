/**
 * Declared failure vocabulary for the blog admin and the CLI.
 *
 * Each failure is a namespaced tag with a wire codec, a data payload and an
 * HTTP projection — declared once and shared by both halves of the wire and by
 * every front end. Callers branch on the tag and read the payload, so no UI has
 * to fish an explanation out of an error message string.
 *
 * Keys become kebab-case tags under the namespace: `staleRevision` ->
 * `post/stale-revision`.
 *
 * BROWSER-SAFE.
 */
import { defineErrors, wire } from "result-rpc";

export const postErrors = defineErrors("post", {
	notFound: { data: wire.object({ slug: wire.string }), httpStatus: 404 },
	slugTaken: { data: wire.object({ slug: wire.string }), httpStatus: 409 },
	/**
	 * Optimistic concurrency, declared once and shared by every writer: a write
	 * that started from a stale copy loses instead of silently overwriting
	 * whoever landed first. The payload carries both revisions so the caller can
	 * say what it was working from.
	 */
	staleRevision: {
		data: wire.object({
			slug: wire.string,
			expected: wire.number,
			current: wire.number,
		}),
		httpStatus: 412,
	},
});

export const categoryErrors = defineErrors("category", {
	notFound: { data: wire.object({ slug: wire.string }), httpStatus: 404 },
	slugTaken: { data: wire.object({ slug: wire.string }), httpStatus: 409 },
	/** A category with posts cannot be deleted; the count is what the UI shows. */
	inUse: {
		data: wire.object({ slug: wire.string, postCount: wire.number }),
		httpStatus: 409,
	},
});

export const commentErrors = defineErrors("comment", {
	notFound: { data: wire.object({ id: wire.number }), httpStatus: 404 },
	/**
	 * Deliberately distinct from `auth/required`. "Sign in" and "that is not
	 * your comment" need different reactions, and a shell that claims the former
	 * would answer the latter with a pointless login redirect.
	 */
	notAuthor: { data: wire.object({ id: wire.number }), httpStatus: 403 },
	/**
	 * A new comment stamps the author's GitHub id and avatar onto the row, so a
	 * GitHub outage blocks the write. Retryable, and the composer says so
	 * instead of silently dropping what was typed.
	 */
	authorUnavailable: { httpStatus: 503, retry: "transient" },
});

export const noteErrors = defineErrors("note", {
	notFound: { data: wire.object({ id: wire.string }), httpStatus: 404 },
	idTaken: { data: wire.object({ id: wire.string }), httpStatus: 409 },
});

/**
 * The OneDollarStats upstream. Its granular failures (fetch rejected, non-2xx,
 * schema mismatch) collapse to one tag at the procedure boundary — the
 * dashboard cannot render anything different for any of them, and it already
 * degrades to "Failed to load stats".
 */
export const statsErrors = defineErrors("stats", {
	unavailable: { httpStatus: 503, retry: "transient" },
});
