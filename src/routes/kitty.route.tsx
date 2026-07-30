/**
 * The /kitty layout route — and the whole integration point.
 *
 *   loader    -> one server function that prefetches and dehydrates
 *   component -> <ResultRpcHydrationBoundary state={loader data}>
 *
 * On the document request the loader runs during SSR, so the HTML already
 * contains the sidebar rows and the warm cache rides the router's SSR payload.
 * On a client-side navigation the same loader runs in the browser and makes
 * ONE server-function call that returns a whole warm cache, rather than every
 * component below firing its own request on mount.
 *
 * This replaces the `renderLegacyRoute` shim that rendered app/kitty/layout as
 * a server component through a compatibility layer.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ResultRpcHydrationBoundary, ResultRpcProvider } from "result-rpc/react";
import { KittyProvider } from "@/src/kitty/components/kitty-context";
import { ThemeSidebar } from "@/src/kitty/components/theme-sidebar";
import { client } from "@/src/kitty/rpc-client";
import { BoundaryProvider, SessionShell, SignInShell } from "@/src/kitty/shells";
import { prefetchKittyShell } from "@/src/kitty/ssr";

export const Route = createFileRoute("/kitty")({
	loader: () => prefetchKittyShell(),
	component: KittyLayout,
});

function KittyLayout() {
	const state = Route.useLoaderData();

	return (
		<ResultRpcProvider client={client}>
			{/* Hydration first, so the shells below read a warm cache and the
			    session resolves without flashing a fallback. */}
			<ResultRpcHydrationBoundary state={state}>
				{/* transport pauses · defects escalate · stale reloads */}
				<BoundaryProvider>
					<SessionShell.Provider>
						<SignInShell.Provider>
							<KittyProvider>
								<div className="flex h-screen overflow-hidden bg-bg">
									<aside className="w-80 border-r border-border overflow-hidden flex flex-col bg-muted/5">
										<ThemeSidebar />
									</aside>
									<main className="flex-1 overflow-y-auto flex flex-col">
										<Outlet />
									</main>
								</div>
							</KittyProvider>
						</SignInShell.Provider>
					</SessionShell.Provider>
				</BoundaryProvider>
			</ResultRpcHydrationBoundary>
		</ResultRpcProvider>
	);
}
