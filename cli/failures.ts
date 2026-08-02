/**
 * Every failure the CLI can be handed, projected to a line of English — once,
 * and exhaustively.
 *
 * `errorCatalog` is the point: it takes the same definition map the contracts
 * take and demands a handler per tag. Adding an error to `postErrors` breaks
 * this file at compile time, and each handler receives its own error with its
 * own `data` type, so `e.data.postCount` is a number rather than something
 * fished out of `unknown` with a runtime typeof guard.
 *
 * The errors stay values right up to the edge. Nothing here throws, nothing
 * stringifies early, and `describe` is only ever called at the point where the
 * process is about to exit with a message.
 */
import {
	ClientDecodeFailure,
	ClientHttpFailure,
	ClientNetworkFailure,
	ClientOffline,
	ClientProtocolViolation,
	ClientStale,
	ClientTimeout,
	ServerBadRequest,
	ServerInternal,
	errorCatalog,
} from "result-rpc";
import { categoryErrors, noteErrors, postErrors, statsErrors } from "../src/blog/errors";
import { authErrors } from "../src/rpc/auth";
import { deviceFlowErrors } from "./auth";
import { editorErrors } from "./editor";

/**
 * The keys are arbitrary — `errorCatalog` rekeys the handlers by tag — but they
 * must be unique, because three different namespaces each spell their key
 * `notFound` and spreading the maps would silently drop two of them.
 */
const failures = {
	authRequired: authErrors.required,
	authForbidden: authErrors.forbidden,

	postNotFound: postErrors.notFound,
	postSlugTaken: postErrors.slugTaken,
	postStaleRevision: postErrors.staleRevision,

	categoryNotFound: categoryErrors.notFound,
	categorySlugTaken: categoryErrors.slugTaken,
	categoryInUse: categoryErrors.inUse,

	noteNotFound: noteErrors.notFound,
	noteIdTaken: noteErrors.idTaken,

	statsUnavailable: statsErrors.unavailable,

	// Not an RPC failure at all — GitHub's device flow, which `blog login`
	// drives directly. It is a tagged value for the same reason everything else
	// here is: so the message can say what actually happened.
	deviceFlowFailed: deviceFlowErrors.failed,

	// Nor is `$EDITOR` refusing to open. Same treatment for the same reason:
	// the message can name the command that failed.
	editorNotConfigured: editorErrors.notConfigured,
	editorAborted: editorErrors.aborted,
	editorFailed: editorErrors.failed,

	// The framework's own boundary errors. A transport client can always
	// produce these, so a CLI that claims to handle every failure has to name
	// them too.
	serverInternal: ServerInternal,
	serverBadRequest: ServerBadRequest,
	clientOffline: ClientOffline,
	clientNetwork: ClientNetworkFailure,
	clientTimeout: ClientTimeout,
	clientHttp: ClientHttpFailure,
	clientProtocol: ClientProtocolViolation,
	clientDecode: ClientDecodeFailure,
	clientStale: ClientStale,
} as const;

export function createDescribe(apiBase: string) {
	return errorCatalog(failures, {
		"auth/required": () => "Not authenticated. Run 'bun run blog login' first.",
		"auth/forbidden": () => "That account is not the admin account.",

		"post/not-found": (error) => `Post not found: ${error.data.slug}`,
		"post/slug-taken": (error) => `A post already exists at "${error.data.slug}".`,
		"post/stale-revision": (error) =>
			[
				`Post changed while the update was in progress (revision ${error.data.current}, you had ${error.data.expected}).`,
				"Fetch it again and reapply your changes.",
			].join("\n"),

		"category/not-found": (error) => `Category not found: ${error.data.slug}`,
		"category/slug-taken": (error) => `A category already exists at "${error.data.slug}".`,
		"category/in-use": (error) =>
			`Category "${error.data.slug}" still has ${error.data.postCount} post(s).`,

		"note/not-found": (error) => `Note not found: ${error.data.id}`,
		"note/id-taken": (error) => `A note already exists at "${error.data.id}".`,

		"stats/unavailable": () => "Stats are unavailable right now.",

		"device-flow/failed": (error) => `GitHub sign-in failed: ${error.data.reason}`,

		"editor/not-configured": () =>
			"No editor configured. Set $EDITOR (or $VISUAL), e.g. `export EDITOR=nvim`.",
		"editor/aborted": (error) =>
			`${error.data.command} exited with ${error.data.code} — nothing was saved.`,
		"editor/failed": (error) => `Could not run ${error.data.command}: ${error.data.reason}`,

		"server/internal": (error) =>
			`Server error. Incident ${error.data.incidentId} — grep the Worker log for it.`,
		"server/bad-request": (error) =>
			[
				"The server rejected the request:",
				...error.data.issues.map(
					(issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`,
				),
			].join("\n"),

		"client/offline": () => `Could not reach ${apiBase} — no network.`,
		"client/network-failure": () => `Could not reach ${apiBase}.`,
		"client/timeout": (error) => `${apiBase} did not respond within ${error.data.timeoutMs}ms.`,
		"client/http-failure": (error) => `${apiBase} answered HTTP ${error.data.status}.`,
		"client/protocol-violation": (error) =>
			`${apiBase} spoke a protocol this CLI does not understand (${error.data.reason}).`,
		"client/decode-failure": (error) =>
			`Could not decode the ${error.data.target} payload from ${apiBase}.`,
		"client/stale": (error) =>
			`This CLI is built against an older contract than ${apiBase} is serving (while handling ${error.data.reclassifiedFrom}). Pull and retry.`,
	});
}
