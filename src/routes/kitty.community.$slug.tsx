import { createFileRoute, Link } from "@tanstack/react-router";
import { ResultRpcHydrationBoundary } from "result-rpc/react";
import { KittyEditor } from "@/src/kitty/components/kitty-editor";
import type { ThemeView } from "@/src/kitty/lib/types";
import type { CommunityThemeDetail } from "@/src/kitty/models";
import { client } from "@/src/kitty/rpc-client";
import { SignInShell } from "@/src/kitty/shells";
import { prefetchCommunityTheme } from "@/src/kitty/ssr";
import { asHead, pageHead } from "@/src/lib/seo";
import { getCommunityKittyThemeHead } from "@/src/server/seo";

export const Route = createFileRoute("/kitty/community/$slug")({
	loader: async ({ params }) => {
		const [prefetch, head] = await Promise.all([
			prefetchCommunityTheme({ data: { slug: params.slug } }),
			getCommunityKittyThemeHead({ data: { slug: params.slug } }),
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
	component: CommunityThemePage,
});

function CommunityThemePage() {
	const { slug } = Route.useParams();
	const data = Route.useLoaderData();

	// Rendered straight from the loader's outcome so a miss paints on the
	// server, rather than after a client round trip.
	if (data.missing) return <CommunityMissing slug={slug} />;

	return (
		<ResultRpcHydrationBoundary state={data.cache}>
			<CommunityThemeDetailView slug={slug} />
		</ResultRpcHydrationBoundary>
	);
}

/** A community theme has no row here, so it is an unsaved ThemeView. */
function toCommunityView(detail: CommunityThemeDetail): ThemeView {
	return {
		id: null,
		slug: detail.meta.slug,
		name: detail.meta.name,
		blurb: detail.meta.blurb,
		authorGithubId: 0,
		authorGithubUsername: detail.meta.author ?? "",
		authorAvatarUrl: "",
		isPublished: false,
		forkedFromId: null,
		createdAt: new Date(),
		modifiedAt: null,
		colors: detail.colors,
	};
}

function CommunityThemeDetailView({ slug }: { slug: string }) {
	const theme = SignInShell.useQuery(
		client.community.bySlug,
		{ slug },
		{ staleTime: 5 * 60_000 },
	);

	switch (theme.state) {
		case "pending":
			return <div className="flex-1" aria-busy="true" />;
		case "failure":
			// Two tags survive the shells, and they mean different things to a
			// reader: the theme is gone, or GitHub is down and it may be back.
			return theme.error._tag === "community/not-found" ? (
				<CommunityMissing slug={slug} />
			) : (
				<CommunityUnavailable retry={() => void theme.refetch()} />
			);
		case "success":
			return (
				<KittyEditor
					initialTheme={toCommunityView(theme.value)}
					initialMode="view"
					isCommunityTheme
				/>
			);
	}
}

function CommunityMissing({ slug }: { slug: string }) {
	return (
		<div className="flex-1 flex items-center justify-center">
			<div className="text-center p-8 max-w-md">
				<h1 className="text-2xl font-bold mb-2">Theme Not Found</h1>
				<p className="text-muted-fg mb-6">
					No community theme called <code>{slug}</code> exists in kitty-themes.
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

function CommunityUnavailable({ retry }: { retry: () => void }) {
	return (
		<div className="flex-1 flex items-center justify-center">
			<div className="text-center p-8 max-w-md">
				<h1 className="text-2xl font-bold mb-2">kitty-themes is unavailable</h1>
				<p className="text-muted-fg mb-6">
					The upstream repository could not be reached. This is usually temporary.
				</p>
				<button
					type="button"
					onClick={retry}
					className="px-6 py-3 bg-primary text-primary-fg rounded-lg font-semibold hover:bg-primary/90 transition-colors"
				>
					Try again
				</button>
			</div>
		</div>
	);
}
