/**
 * Declared failure vocabulary for the Kitty theme browser.
 *
 * Each failure is a namespaced tag with a wire codec and an HTTP projection,
 * declared once and shared by both sides of the wire, so the client branches on
 * a tag instead of rendering "something went wrong".
 *
 * Keys become kebab-case tags under the namespace: `notFound` -> `theme/not-found`.
 */
import { defineErrors, type ErrorUnion, wire } from "result-rpc";

/**
 * The `auth/*` vocabulary lives in src/rpc/auth.ts, because the blog admin
 * needs the same tags and the contract is the error registry: one tag has
 * exactly one definition app-wide.
 *
 * `theme/not-owner` stays here and stays separate from `auth/required` — "sign
 * in" and "this isn't yours" are different outcomes, and collapsing them would
 * hand a 403 to a shell whose only move is a login redirect.
 */
export const themeErrors = defineErrors("theme", {
	notFound: { data: wire.object({ themeId: wire.number }), httpStatus: 404 },
	notOwner: { data: wire.object({ themeId: wire.number }), httpStatus: 403 },
	forkUnpublished: { data: wire.object({ themeId: wire.number }), httpStatus: 409 },
	/**
	 * Saving a theme stamps the author's GitHub avatar and id onto the row, so a
	 * GitHub outage blocks the write. Declared and retryable, so the editor can
	 * say so instead of losing the edit.
	 */
	authorUnavailable: { httpStatus: 503, retry: "transient" },
});

/**
 * The upstream kovidgoyal/kitty-themes repository. Its granular failure modes
 * (fetch rejected, non-2xx, malformed JSON) are collapsed to one tag at the
 * procedure boundary — a component rendering the community list cannot do
 * anything different with any of them.
 */
export const communityErrors = defineErrors("community", {
	unavailable: { httpStatus: 503, retry: "transient" },
	notFound: { data: wire.object({ slug: wire.string }), httpStatus: 404 },
});

/**
 * The two outcomes `themes.update` can present to the editor — the contract's
 * declared errors minus the `auth/*` and `server/*` shells claim. Mirrors the
 * `pickErrors(themeErrors, "notFound", "notOwner")` the update contract
 * declares, so the component's union cannot drift from the wire.
 */
export type ThemeSaveError = ErrorUnion<{
	notFound: typeof themeErrors.notFound;
	notOwner: typeof themeErrors.notOwner;
}>;
