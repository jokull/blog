/**
 * The CLI's client.
 *
 * `createBrowserClient` is a misnomer here but it is the right factory: it is
 * the *transport* client, and the only one of the two that can talk to a remote
 * origin. The other, `createServerClient`, is in-process — it takes the router
 * and a live context, so it would need the D1 binding and the session password
 * in this process and still could not reach www.solberg.is. Nothing about
 * `createBrowserClient` needs a DOM; it needs `fetch`, which Bun has.
 *
 * It is built from the CONTRACT, exactly as the browser's is, so the CLI and the
 * dashboard share one set of codecs and one closed error union per procedure.
 */
import { createBrowserClient, fetchTransport } from "result-rpc/client";
import { appContract } from "../src/rpc/contract";

// `worker-configuration.d.ts` declares every binding as a required
// `ProcessEnv` key, which is true inside the Worker and a lie here — this CLI
// runs on plain Bun, where the variable really can be absent.
// oxlint-disable-next-line typescript/no-unnecessary-condition
const API_BASE = process.env.BLOG_API_URL ?? "http://localhost:5173";

export function createClient(token?: string) {
	return createBrowserClient({
		contract: appContract,
		transport: fetchTransport({
			url: `${API_BASE}/api/rpc`,
			// The session middleware accepts a Bearer token as an alternative to
			// the iron-session cookie, which is the whole of the CLI's auth story.
			headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
		}),
	});
}

export type BlogClient = ReturnType<typeof createClient>;

export { API_BASE };
