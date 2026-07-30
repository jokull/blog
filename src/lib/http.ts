/**
 * A 302 whose headers are mutable.
 *
 * `Response.redirect()` returns a response with an **immutable** header list.
 * TanStack Start merges staged response headers into whatever a server handler
 * returns (`mergeEventResponseHeaders`), so any route that writes a cookie —
 * every route that calls `session.save()` — and then returns
 * `Response.redirect()` dies with:
 *
 *     TypeError: Can't modify immutable headers.
 *
 * which surfaces to the browser as an opaque
 * `{"status":500,"unhandled":true,"message":"HTTPError"}`. Constructing the
 * response directly keeps the headers writable, so the session cookie can be
 * attached on the way out.
 */
export function redirect(location: string, status: 301 | 302 | 303 | 307 | 308 = 302) {
	return new Response(null, { status, headers: { Location: location } });
}
