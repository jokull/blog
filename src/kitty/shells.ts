/**
 * The shell onion. Each layer of it deletes a class of branch from every
 * component below.
 *
 *   BoundaryProvider   transport pauses · defects escalate · stale reloads
 *     SessionShell     provides `viewer: Viewer | null`, claims nothing
 *       SignInShell    claims `auth/required`, reacts with the OAuth redirect
 *
 * The payoff is visible in the component diff: `theme-sidebar.tsx` and
 * `kitty-editor.tsx` each carried their own
 * `if (!username) window.location.href = "/auth/login?next=..."` before a
 * mutation. Ownership of that outcome is positional now, so the call sites
 * just call.
 */
import { isCancelled, isClaimed } from "result-rpc/client";
import { boundaryShells, defineShell, layerShell } from "result-rpc/react";
import { authErrors } from "./errors";
import { SessionLayer } from "./layers";

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
 * Claims `auth/required` for the whole kitty tree. A mutation attempted while
 * signed out pauses and sends the visitor to GitHub instead of surfacing a
 * failure the component would have to render — and `SignInShell.useMutation`
 * subtracts the tag from the union, so components cannot even branch on it.
 */
export const SignInShell = defineShell({
	name: "sign-in",
	from: SessionShell,
	claims: authErrors,
	onError: () => {
		signIn();
	},
});

export { signIn };

/**
 * Fire-and-forget a `mutate()` from an event handler.
 *
 * The returned promise resolves to a `Result` for declared failures, but
 * rejects for the two *control* signals: `cancelled` (the caller called
 * `.cancel()`) and `claimed` (a shell above owns this outcome and the
 * caller's continuation must not run). Neither is an error to report — they
 * mean "this continuation is void" — so they are swallowed here and anything
 * else is surfaced.
 */
export function dispatch(promise: Promise<unknown>): void {
	void promise.catch((reason: unknown) => {
		if (isClaimed(reason) || isCancelled(reason)) return;
		// oxlint-disable-next-line no-console -- an unexpected rejection is a defect.
		console.error("[kitty]", reason);
	});
}
