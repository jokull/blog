/**
 * The shell onion. Each layer of it deletes a class of branch from every
 * component below.
 *
 *   BoundaryProvider   transport pauses · defects escalate · stale reloads
 *     SessionShell     provides `viewer: Viewer | null`, claims nothing
 *       SignInShell    claims `auth/required`, reacts with the OAuth redirect
 *
 * Ownership of "you must sign in first" is positional: it belongs to the shell,
 * not to the components, so no call site guards a mutation with its own
 * `if (!username) window.location.href = "/auth/login?next=…"`.
 */
import { boundaryShells, defineShell, layerShell } from "result-rpc/react";
import { SessionLayer, signInErrors } from "./auth";

export const { TransportShell, DefectShell, StaleShell, BoundaryProvider, useConnectivity } =
	boundaryShells();

/**
 * Derived from the same declaration as the server middleware and the
 * `session` endpoint. Its Provider loads the value through that endpoint and
 * auto-resumes held work when the session is re-established — so signing back
 * in refills the screen instead of leaving it blank.
 */
export const SessionShell = layerShell(SessionLayer, {
	from: StaleShell,
	select: (client) => client.session,
});

function signIn() {
	const next = encodeURIComponent(window.location.pathname);
	window.location.href = `/auth/login?next=${next}`;
}

/**
 * Claims `auth/required` for every tree below it. A mutation attempted while
 * signed out pauses and sends the visitor to GitHub instead of surfacing a
 * failure the component would have to render — and `SignInShell.useMutation`
 * subtracts the tag from the union, so components cannot even branch on it.
 */
export const SignInShell = defineShell({
	name: "sign-in",
	from: SessionShell,
	claims: signInErrors,
	onError: () => {
		signIn();
	},
});

export { signIn };

/*
 * No dispatch helper lives here on purpose. `mutate()` returns void and never
 * rejects, so event handlers call it bare; `mutateAsync()` returns the Result
 * and rejects with the `cancelled`/`claimed` control signals, so reach for it
 * only where the outcome is actually awaited and those signals are handled.
 */
