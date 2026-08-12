/**
 * The request context, declared where both halves of the wire can see it.
 *
 * The `@/db` import is type-only and erased at build, so this module is safe
 * for the browser graph even though `@/db` itself reaches `cloudflare:workers`
 * and the D1 binding. Keeping the interface here rather than in the server
 * module means `app.ts` does not have to reach across the client boundary to
 * name its own context.
 */
import type { Db } from "@/db";

export interface AppContext {
	readonly db: Db;
	/**
	 * The raw `Authorization` header, or null when there isn't one.
	 *
	 * The CLI authenticates with a Bearer token; the browser authenticates with
	 * the iron-session cookie, which the session middleware reads from TanStack
	 * Start's ambient request scope. Only the header has to be threaded, and
	 * carrying just this string rather than the whole `Request` keeps the
	 * in-process server client (SSR prefetch, OG images) honest: there is no
	 * HTTP request there, so it passes `null`.
	 */
	readonly authorization: string | null;
}
