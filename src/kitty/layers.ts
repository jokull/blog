/**
 * The session, declared once.
 *
 * The blog previously kept three artifacts that had to agree and didn't: the
 * `getSession()` call at the top of every server action, the `username` prop
 * threaded from the RSC layout into KittyProvider, and each component's own
 * `if (!username) window.location.href = "/auth/login"`. A layer is the single
 * declaration all three derive from — the context key, the wire codec of the
 * value, and the errors raised while establishing it.
 *
 * Browser-safe: codecs and error definitions only, no session secret.
 */
import { defineLayer, err, ok, wire, type InputOf } from "result-rpc";
import { authErrors } from "./errors";

export const ViewerCodec = wire.object({
	username: wire.string,
	isAdmin: wire.boolean,
});
export type Viewer = InputOf<typeof ViewerCodec>;

/**
 * Optional: a visitor with no cookie is a perfectly good state here — the
 * theme browser is public. Declaring no errors means this layer always
 * establishes, so its shell claims nothing and its Provider never redirects.
 */
export const SessionLayer = defineLayer({
	name: "session",
	key: "viewer",
	provides: wire.union([ViewerCodec, wire.null]),
	errors: {},
});

/**
 * The refinement that write paths demand. It contributes `auth/required` to
 * every procedure that uses it, which is the union SignInShell claims on the
 * client — so "you must sign in to do that" is handled once, positionally,
 * instead of at each of the six call sites that used to check `username`.
 */
export const ViewerLayer = SessionLayer.require({
	name: "viewer",
	provides: ViewerCodec,
	errors: authErrors,
	refine: ({ value, errors }) => (value === null ? err(errors.required()) : ok(value)),
});
