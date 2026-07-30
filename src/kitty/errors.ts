/**
 * Declared failure vocabulary for the Kitty theme browser.
 *
 * Every one of these used to be `throw new Error("Unauthorized")` in
 * app/kitty/mutations.ts — an opaque string the client could only render as
 * "something went wrong". Here each is a namespaced tag with a wire codec and
 * an HTTP projection, declared once and shared by both sides of the wire.
 *
 * Keys become kebab-case tags under the namespace: `notFound` -> `theme/not-found`.
 */
import { defineErrors, wire } from "result-rpc";

/**
 * Claimed by AuthShell, which reacts by sending the visitor to GitHub OAuth.
 * Kept deliberately separate from `theme/not-owner`: "sign in" and "this isn't
 * yours" are different outcomes, and collapsing them would hand a 403 to a
 * shell whose only move is a login redirect.
 */
export const authErrors = defineErrors("auth", {
	required: { httpStatus: 401 },
});

export const themeErrors = defineErrors("theme", {
	notFound: { data: wire.object({ themeId: wire.number }), httpStatus: 404 },
	notOwner: { data: wire.object({ themeId: wire.number }), httpStatus: 403 },
	forkUnpublished: { data: wire.object({ themeId: wire.number }), httpStatus: 409 },
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
