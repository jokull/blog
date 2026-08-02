/**
 * The browser client — built from the CONTRACT, never the router.
 *
 * result-rpc ships a real runtime value to the browser (unlike tRPC, which
 * ships only a type), so what this file imports decides what bundles. Importing
 * ./server here would ship the D1 binding, the iron-session password and every
 * handler closure to every visitor, and no bundler would tree-shake it away.
 *
 * `url` matches the `endpoint` set on createFetchHandler: Start's server routes
 * live under /api, so both ends say /api/rpc rather than the library default
 * /rpc.
 */
import { batchFetchTransport, createBrowserClient } from "result-rpc/client";
import { appContract } from "./contract";

/**
 * Batching earns its keep on the admin dashboard, which opens with four
 * independent queries (posts, categories, stats and the session):
 * `batchFetchTransport` coalesces everything issued in the same microtask into
 * one HTTP request, with per-item status.
 */
export const client = createBrowserClient({
	contract: appContract,
	transport: batchFetchTransport({ url: "/api/rpc" }),
});

export type AppClient = typeof client;

/**
 * TanStack-style registration: `useResultClient()` and the deferred `select:`
 * in layerShell both resolve to this client with no call-site generic. There is
 * exactly one slot, which is why there is exactly one client.
 */
declare module "result-rpc/react" {
	interface Register {
		client: AppClient;
	}
}
