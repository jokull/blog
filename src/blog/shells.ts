/**
 * The admin tree's shell, one layer deeper than the app-wide onion.
 *
 *   BoundaryProvider   transport pauses · defects escalate · stale reloads
 *     SessionShell     provides `viewer: Viewer | null`, claims nothing
 *       SignInShell    claims `auth/required`, reacts with the OAuth redirect
 *         AdminShell   claims `auth/forbidden`, holds and renders
 *
 * The two auth outcomes need different reactions, which is the whole reason
 * they are separate tags. `auth/required` reacts — off to GitHub. `auth/forbidden`
 * has nowhere to send you: you are signed in, correctly, as the wrong person.
 * So this shell pauses and the screen says so, once, instead of every admin
 * component carrying `if (!viewer.isAdmin)`.
 *
 * Because AdminShell claims it, `AdminShell.useQuery`/`.useMutation` subtract
 * `auth/forbidden` from every union below — no admin component can branch on it.
 */
import { defineShell } from "result-rpc/react";
import { adminErrors } from "@/src/rpc/auth";
import { SignInShell } from "@/src/rpc/shells";

export const AdminShell = defineShell({
	name: "admin",
	from: SignInShell,
	claims: adminErrors,
});
