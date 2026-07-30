/**
 * The browser client — built from the CONTRACT, never the router.
 *
 * result-rpc ships a real runtime value to the browser (unlike tRPC, which
 * ships only a type), so what this file imports decides what bundles.
 * Importing ./rpc-server here would ship the D1 binding, the iron-session
 * secret and every handler closure to every visitor, and no bundler would
 * tree-shake it away.
 *
 * `url` matches the `endpoint` set on createFetchHandler: Start's server
 * routes live under /api, so both ends say /api/rpc rather than the library
 * default /rpc.
 */
import { createBrowserClient, fetchTransport } from "result-rpc/client";
import { kittyContract } from "./contract";

export const client = createBrowserClient({
	contract: kittyContract,
	transport: fetchTransport({ url: "/api/rpc" }),
});

export type KittyClient = typeof client;

/**
 * TanStack-style registration: `useResultClient()` and the deferred
 * `select:` in layerShell both resolve to this client with no call-site
 * generic.
 */
declare module "result-rpc/react" {
	interface Register {
		client: KittyClient;
	}
}
