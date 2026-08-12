/**
 * SERVER-ONLY: the app router, the request context, and the fetch-handler
 * mount.
 *
 * This module closes over the D1 binding, the iron-session password and the
 * GitHub client secret. Its only legitimate importers are the `/api/rpc` server
 * route, the `createServerFn` prefetchers in the ssr modules, and the OG/SEO
 * server routes — all of which TanStack Start strips from the client build.
 */
import { Panic } from "better-result";
import { createFetchHandler, createServerClient } from "result-rpc/server";
import {
	categoriesRouter,
	cliRouter,
	commentsRouter,
	linksRouter,
	notesRouter,
	postsRouter,
	statsRouter,
} from "@/src/blog/rpc-server";
import { communityRouter, themesRouter } from "@/src/kitty/rpc-server";
import { createDb } from "@/db";
import { AdminLayer, SessionLayer, ViewerLayer } from "./auth";
import { adminContract, sessionContract, viewerContract } from "./contract";
import type { AppContext } from "./context";
import { requireAdmin, requireViewer, server, session } from "./server-base";

export const router = server.router({
	session: SessionLayer.implement(server, sessionContract, session),
	viewer: ViewerLayer.implement(server, viewerContract, requireViewer),
	admin: AdminLayer.implement(server, adminContract, requireAdmin),
	themes: themesRouter,
	community: communityRouter,
	posts: postsRouter,
	categories: categoriesRouter,
	notes: notesRouter,
	comments: commentsRouter,
	links: linksRouter,
	stats: statsRouter,
	cli: cliRouter,
});

export type AppRouter = typeof router;

/**
 * `authorization` is null for in-process callers — SSR prefetch, OG images —
 * which is correct: they have no HTTP request, and the session middleware falls
 * through to the cookie in TanStack Start's ambient request scope.
 */
export function createContext(authorization: string | null = null): AppContext {
	return {
		// Per-request: workerd cannot reuse a TCP connection across request
		// handlers, so each request gets its own database (pool, max 1). The
		// isolate reaps it when the request ends.
		db: createDb().db,
		authorization,
	};
}

/**
 * In-process caller for server routes that are not the RPC endpoint — OG image
 * generation, SEO head resolution, and the SSR prefetchers. It keeps everything
 * that decides whether a call is correct (middleware, validation, codecs,
 * private-error sanitization) and drops only the transport, so these callers
 * get the same visibility rules as the browser rather than a second, divergent
 * query.
 */
export function appServerClient() {
	return createServerClient(router, { context: createContext() });
}

/**
 * Mounted at POST /api/rpc by src/routes/api.rpc.ts. The library default is
 * `/rpc` and Start's server routes live under `/api`, so both ends are set
 * explicitly — here, and on the transport in ./client.
 */
export const rpcHandler = createFetchHandler({
	router,
	endpoint: "/api/rpc",
	createContext: ({ request }) => createContext(request.headers.get("authorization")),
	onInternalError: ({ incidentId, procedurePath, cause }) => {
		// Peel every Panic wrapper down to the defect: tryRecover's recover
		// callback re-throws are wrapped by tryOrPanic, and a gen body re-wraps
		// that again. db-result then attaches the original driver error as a
		// non-enumerable Error.cause, so walk that too — the deepest message is
		// the real failure (the D1 error behind db/connect-failure).
		let defect: unknown = cause;
		for (
			let depth = 0;
			depth < 8 && Panic.is(defect) && defect.cause !== undefined;
			depth += 1
		) {
			defect = defect.cause;
		}
		let leaf: unknown = defect;
		for (
			let depth = 0;
			depth < 8 && leaf instanceof Error && leaf.cause !== undefined;
			depth += 1
		) {
			leaf = leaf.cause;
		}
		const name = defect instanceof Error && defect.name !== "Error" ? defect.name : "";
		const leafMessage = leaf instanceof Error && leaf.message ? leaf.message : "";
		const message = [name, leafMessage].filter(Boolean).join(" — ") || String(leaf ?? defect);
		// oxlint-disable-next-line no-console -- defects belong in the Worker log.
		console.error(
			`[rpc] incident=${incidentId} path=${procedurePath ?? "?"} ${message}`,
			leaf instanceof Error ? leaf.stack : leaf,
		);
	},
});
