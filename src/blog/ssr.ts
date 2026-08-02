/**
 * The SSR prefetch layer for the admin routes.
 *
 * TanStack Start loaders are ISOMORPHIC: they run on the server for the
 * document request and in the BROWSER on every client-side navigation. A loader
 * that imported the router directly would typecheck, work in dev SSR, and then
 * ship the D1 binding and the session password to the browser the first time
 * someone navigated within the site. `createServerFn` is the wall — Start
 * compiles these handler bodies out of the client bundle and leaves a fetch
 * stub.
 */
import { createServerFn } from "@tanstack/react-start";
import { createQueryRuntime } from "result-rpc/query";
import { createServerClient } from "result-rpc/server";
import { createContext, router } from "@/src/rpc/server";

const buildRuntime = () => {
	const serverClient = createServerClient(router, { context: createContext() });
	return { serverClient, runtime: createQueryRuntime({ client: serverClient }) };
};

/**
 * The dashboard. Every panel is prefetched in one pass so the HTML arrives
 * complete, and a client-side navigation makes ONE server-function call instead
 * of four components each firing on mount.
 *
 * `stats.overview` is prefetched alongside the rest but is allowed to fail —
 * failed prefetches are deliberately not dehydrated, so an upstream outage
 * costs an in-process call and the panel starts cold on the client, where its
 * `retry: "transient"` policy gets a live attempt.
 */
export const prefetchAdminDashboard = createServerFn({ method: "GET" }).handler(async () => {
	const { serverClient, runtime } = buildRuntime();
	await Promise.all([
		runtime.prefetch(serverClient.session, {}),
		runtime.prefetch(serverClient.posts.list, {}),
		runtime.prefetch(serverClient.categories.list, {}),
		runtime.prefetch(serverClient.stats.overview, {}),
	]);
	return runtime.dehydrate();
});
