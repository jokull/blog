/**
 * The SSR prefetch layer.
 *
 * TanStack Start loaders are ISOMORPHIC: they run on the server for the
 * document request and in the BROWSER on every client-side navigation. A
 * loader that imported ./rpc-server directly would typecheck, work in dev SSR,
 * and then ship the D1 binding and the session secret to the browser the first
 * time someone navigated within the site. There is no `'use client'` wall
 * here — `createServerFn` is the wall, and Start compiles these handler bodies
 * out of the client bundle, leaving a fetch stub.
 *
 * Each function builds a per-request runtime over an in-process server client,
 * prefetches, and returns `runtime.dehydrate()` — a plain
 * `{ v, serializer, payload }` object that rides the loader's SSR payload like
 * any other loader data.
 */
import { createServerFn } from "@tanstack/react-start";
import { createQueryRuntime } from "result-rpc/query";
import { createServerClient } from "result-rpc/server";
import { createContext, router } from "./rpc-server";

const buildRuntime = () => {
	const serverClient = createServerClient(router, { context: createContext() });
	return { serverClient, runtime: createQueryRuntime({ client: serverClient }) };
};

/**
 * The /kitty layout loader: the session (so SessionShell resolves without
 * rendering a fallback) and the two sidebar lists. `mine` is prefetched
 * unconditionally — signed out it fails with `auth/required`, and failed
 * prefetches are deliberately not dehydrated, so the anonymous case costs an
 * in-process call and ships nothing.
 *
 * Child routes prefetch only what they own; the boundaries merge into one
 * client runtime.
 */
export const prefetchKittyShell = createServerFn({ method: "GET" }).handler(async () => {
	const { serverClient, runtime } = buildRuntime();
	await Promise.all([
		runtime.prefetch(serverClient.session, {}),
		runtime.prefetch(serverClient.themes.published, {}),
		runtime.prefetch(serverClient.themes.mine, {}),
	]);
	return runtime.dehydrate();
});

/**
 * Failed prefetches are deliberately not dehydrated — replaying a server-side
 * failure on the client would show an error the user cannot retry past. That
 * is right for transient failures, but it means a genuinely missing theme
 * would SSR an empty body and only reveal "not found" after a client round
 * trip. So the outcome rides back beside the cache and the route renders it
 * immediately; the cache stays failure-free.
 */
export const prefetchKittyTheme = createServerFn({ method: "GET" })
	.validator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		const { serverClient, runtime } = buildRuntime();
		const result = await runtime.prefetch(serverClient.themes.byId, { id: data.id });
		return { cache: runtime.dehydrate(), missing: !result.ok };
	});

export const prefetchCommunityTheme = createServerFn({ method: "GET" })
	.validator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const { serverClient, runtime } = buildRuntime();
		const [, detail] = await Promise.all([
			runtime.prefetch(serverClient.community.list, {}),
			runtime.prefetch(serverClient.community.bySlug, { slug: data.slug }),
		]);
		return {
			cache: runtime.dehydrate(),
			// Only a genuine miss is reported. If the upstream is merely down,
			// the client starts the query cold and its `retry: "transient"`
			// policy gets a live attempt — better than freezing one request's
			// bad luck into the HTML.
			missing: !detail.ok && detail.error._tag === "community/not-found",
		};
	});
