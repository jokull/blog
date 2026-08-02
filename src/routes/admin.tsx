/**
 * /admin — a native TanStack Start route.
 *
 *   loader    -> one server function that prefetches and dehydrates
 *   component -> <ResultRpcHydrationBoundary state={loader data}>
 *
 * The client and the boundary shells are mounted once in `__root.tsx`; this
 * route adds only the identity layers, since it is one of the few places that
 * needs a viewer.
 *
 * On the document request the loader runs during SSR, so the HTML already
 * contains the table. On a client-side navigation the same loader runs in the
 * browser and makes ONE server-function call that returns a whole warm cache,
 * rather than four panels each firing their own request on mount.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ResultRpcHydrationBoundary } from "result-rpc/react";
import { AdminDashboard } from "@/src/blog/components/admin-dashboard";
import { AdminGate } from "@/src/blog/components/admin-gate";
import { AdminShell } from "@/src/blog/shells";
import { prefetchAdminDashboard } from "@/src/blog/ssr";
import { SessionShell, SignInShell } from "@/src/rpc/shells";

export const Route = createFileRoute("/admin")({
	loader: () => prefetchAdminDashboard(),
	component: AdminPage,
});

function AdminPage() {
	const state = Route.useLoaderData();

	// Hydration first, so the shells below read a warm cache and the session
	// resolves without flashing a fallback. The client and the boundary shells
	// come from __root.tsx.
	return (
		<ResultRpcHydrationBoundary state={state}>
			<SessionShell.Provider>
				{/* claims auth/required — reacts with the OAuth redirect */}
				<SignInShell.Provider>
					{/* claims auth/forbidden — held and rendered by AdminGate */}
					<AdminShell.Provider>
						<AdminGate>
							<AdminDashboard />
						</AdminGate>
					</AdminShell.Provider>
				</SignInShell.Provider>
			</SessionShell.Provider>
		</ResultRpcHydrationBoundary>
	);
}
