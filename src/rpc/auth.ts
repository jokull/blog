/**
 * The session, declared once for the whole app.
 *
 * Lives at the app level, not inside a feature: the kitty tree and the blog
 * admin need the same viewer, and the contract is the error registry, so one tag
 * has exactly one definition app-wide. Two `defineErrors("auth", ...)` calls
 * would give two `auth/required` definitions that shells could not both claim.
 *
 * BROWSER-SAFE: codecs, error definitions and refinement predicates. No session
 * secret, no cookie access, no database.
 */
import { defineLayer, defineErrors, err, ok, pickErrors, wire, type InputOf } from "result-rpc";

/**
 * `required` and `forbidden` are deliberately distinct outcomes with distinct
 * reactions: signed out means "go to GitHub", signed in as the wrong person
 * means "this screen is not for you". Collapsing them would hand a 403 to a
 * shell whose only move is a login redirect — an infinite loop for anyone but
 * the admin.
 */
export const authErrors = defineErrors("auth", {
	required: { httpStatus: 401 },
	forbidden: { httpStatus: 403 },
});

/** What the viewer layer contributes. Claimed by SignInShell. */
export const signInErrors = pickErrors(authErrors, "required");

/** What the admin layer adds on top. Rendered, never reacted to. */
export const adminErrors = pickErrors(authErrors, "forbidden");

export const ViewerCodec = wire.object({
	username: wire.string,
	isAdmin: wire.boolean,
});
export type Viewer = InputOf<typeof ViewerCodec>;

/**
 * Optional: a visitor with no cookie is a perfectly good state — the theme
 * browser is public. Declaring no errors means this layer always establishes,
 * so its shell claims nothing and its Provider never redirects.
 */
export const SessionLayer = defineLayer({
	name: "session",
	key: "viewer",
	provides: wire.nullable(ViewerCodec),
	errors: {},
});

/**
 * The refinement every write path demands. It contributes `auth/required` to
 * each procedure that uses it, which is the union SignInShell claims — so "you
 * must sign in to do that" is handled once, positionally.
 */
export const ViewerLayer = SessionLayer.require({
	name: "viewer",
	provides: ViewerCodec,
	errors: signInErrors,
	refine: ({ value, errors }) => (value === null ? err(errors.required()) : ok(value)),
});

/**
 * The admin refinement, derived from the SESSION layer rather than from
 * ViewerLayer — `require()` narrows an optional layer once and does not chain,
 * so this collapses both steps and declares both outcomes. A signed-out visitor
 * still gets `auth/required` (and the login redirect); a signed-in non-admin
 * gets `auth/forbidden`, which no shell claims, so the screen renders it.
 */
export const AdminLayer = SessionLayer.require({
	name: "admin",
	provides: ViewerCodec,
	errors: authErrors,
	refine: ({ value, errors }) => {
		if (value === null) return err(errors.required());
		if (!value.isAdmin) return err(errors.forbidden());
		return ok(value);
	},
});
