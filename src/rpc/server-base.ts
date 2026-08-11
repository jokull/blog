/**
 * SERVER-ONLY: the executable factory and the middleware chain.
 *
 * Split from ./server so that src/kitty and src/blog can implement procedures
 * against `server` without importing the module that composes the router out of
 * them — that would be a cycle.
 *
 * Nothing in the browser graph may import this file or anything downstream of
 * it: it closes over the D1 binding and the iron-session password.
 */
import { ok, type AnyTaggedError } from "result-rpc";
import { serverRpc } from "result-rpc/server";
import { getGithubUser, getSession, whoami } from "@/auth";
import { isFetchUnreachable } from "@/lib/safe-utils";
import { verifyCliToken } from "@/lib/cli-token";
import { AdminLayer, SessionLayer, ViewerLayer, type Viewer } from "./auth";
import type { AppContext } from "./context";

export const server = serverRpc.context<AppContext>();

/** The single account with write access. Mirrored nowhere else. */
const ADMIN_USERNAME = "jokull";

const asViewer = (username: string): Viewer => ({
	username,
	isAdmin: username === ADMIN_USERNAME,
});

/**
 * Bearer authentication, for the CLI.
 *
 * Two token formats are accepted: a signed CLI token (which always contains a
 * `.`), and a raw GitHub access token, which is what `blog login` holds during
 * the one call that exchanges it for the former. The two are told apart by
 * shape, not tried in turn — see below.
 */
async function viewerFromBearer(token: string): Promise<Viewer | null> {
	// The `.` is decisive, not a hint: GitHub's tokens are `gh?_`-prefixed and
	// contain no dots, so a dotted token is a CLI token and nothing else. A failed
	// signature must not fall through to GitHub — that would report an expired
	// `~/.blog-cli-session` as "Failed to reach GitHub: 401", an outage message
	// for what is really a stale local credential.
	if (token.includes(".")) {
		const username = await verifyCliToken(token);
		return username === null ? null : asViewer(username);
	}

	// A Result, not a throw. A bad token is an anonymous caller, not a defect —
	// the layer above decides whether anonymous is allowed here. This path is the
	// raw GitHub token `blog login` holds for the single call that exchanges it.
	const user = await whoami(token);
	return user.map((u) => asViewer(u.login)).unwrapOr(null);
}

/**
 * Establishes the session. Declared with no errors, so a signed-out visitor is
 * `viewer: null` rather than a failure — most of the theme browser is public.
 */
export const session = SessionLayer.middleware(server, async ({ context }) => {
	const header = context.authorization;
	if (header?.startsWith("Bearer ")) {
		return ok(await viewerFromBearer(header.slice("Bearer ".length)));
	}

	const cookie = await getSession();
	if (!cookie.githubUsername) return ok(null);
	return ok(asViewer(cookie.githubUsername));
});

/**
 * Passing `session` bundles the parent, so a single `.use()` pulls the whole
 * chain in dependency order and contributes the refinement's union to the
 * procedure's declared errors.
 */
export const requireViewer = ViewerLayer.middleware(server, session);
export const requireAdmin = AdminLayer.middleware(server, session);

/**
 * The GitHub author profile, folded to the caller's declared tag.
 *
 * A GitHub outage is a declared, retryable failure rather than a thrown 500,
 * and the fetch boundary's `tapError` logs upstream-wrong responses (status /
 * malformed / schema) as incidents while the reader just gets the retryable
 * tag. Call from a gen body: `yield* await fetchAuthor(viewer, () => …)`.
 */
export const fetchAuthor = async <E extends AnyTaggedError>(viewer: Viewer, toDeclared: () => E) =>
	(await getGithubUser(viewer.username))
		.tapError(isFetchUnreachable)
		.mapError(() => toDeclared());
