import { createFileRoute, Link } from "@tanstack/react-router";
import { ResultRpcHydrationBoundary } from "result-rpc/react";
import { KittyEditor } from "@/src/kitty/components/kitty-editor";
import { toThemeView } from "@/src/kitty/lib/types";
import { client } from "@/src/kitty/rpc-client";
import { SessionShell, SignInShell } from "@/src/kitty/shells";
import { prefetchKittyTheme } from "@/src/kitty/ssr";
import { asHead, pageHead } from "@/src/lib/seo";
import { getKittyThemeHead } from "@/src/server/seo";

export const Route = createFileRoute("/kitty/$id")({
	loader: async ({ params }) => {
		const [prefetch, head] = await Promise.all([
			prefetchKittyTheme({ data: { id: Number(params.id) } }),
			getKittyThemeHead({ data: { id: params.id } }),
		]);
		return { cache: prefetch.cache, missing: prefetch.missing, head: asHead(head) };
	},
	head: ({ loaderData }) =>
		loaderData?.head ??
		asHead(
			pageHead({
				title: "Kitty Theme Builder",
				description:
					"Create and share beautiful color themes for the Kitty terminal emulator.",
				path: "/kitty",
			}),
		),
	component: ThemePage,
});

function ThemePage() {
	const { id } = Route.useParams();
	const data = Route.useLoaderData();

	// Rendered straight from the loader's outcome so a miss paints on the
	// server, rather than after a client round trip.
	if (data.missing) return <ThemeNotFound />;

	return (
		<ResultRpcHydrationBoundary state={data.cache}>
			<ThemeDetail id={Number(id)} />
		</ResultRpcHydrationBoundary>
	);
}

function ThemeDetail({ id }: { id: number }) {
	const viewer = SessionShell.use();
	const theme = SignInShell.useQuery(client.themes.byId, { id }, { staleTime: 60_000 });

	switch (theme.state) {
		case "pending":
			return <div className="flex-1" aria-busy="true" />;
		case "failure":
			// `theme/not-found` is the only tag left: transport, defects, stale
			// and auth are all claimed above. Adding another case here would be
			// a type error, and removing a provider would break this line.
			return <ThemeNotFound />;
		case "success": {
			const canEdit =
				viewer !== null &&
				(viewer.isAdmin || viewer.username === theme.value.authorGithubUsername);
			return (
				<KittyEditor
					initialTheme={toThemeView(theme.value)}
					initialMode="view"
					canEdit={canEdit}
				/>
			);
		}
	}
}

function ThemeNotFound() {
	return (
		<div className="flex-1 flex items-center justify-center">
			<div className="text-center p-8 max-w-md">
				<h1 className="text-2xl font-bold mb-2">Theme Not Found</h1>
				<p className="text-muted-fg mb-6">
					The theme you&apos;re looking for doesn&apos;t exist or has been deleted.
				</p>
				<Link
					to="/kitty"
					className="inline-block px-6 py-3 bg-primary text-primary-fg rounded-lg font-semibold hover:bg-primary/90 transition-colors"
				>
					Browse Themes
				</Link>
			</div>
		</div>
	);
}
