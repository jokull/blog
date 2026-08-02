/**
 * The dashboard.
 *
 * Renders entirely from the cache: the SSR prefetch fills it, mutations patch
 * it by entity identity, and the panels below never see a loading state on a
 * client-side navigation.
 *
 * The category post-counts are derived here rather than fetched. `posts.list`
 * is already loaded and already authoritative, so a separate GROUP BY would be
 * a second source of truth that could disagree with the table on screen.
 */
import { client } from "@/src/rpc/client";
import { BrokenLinksPanel } from "./broken-links-panel";
import { CategoryManager } from "./category-manager";
import { PostsTable } from "./posts-table";
import { VisitsChart } from "./visits-chart";
import { AdminShell } from "../shells";

export function AdminDashboard() {
	const posts = AdminShell.useQuery(client.posts.list, {});
	const categories = AdminShell.useQuery(client.categories.list, {});
	/**
	 * The only query here that can fail with something the screen must render.
	 * `auth/*` is claimed by the shells above, so it is subtracted from this
	 * union entirely — `stats/unavailable` is all that is left, and it already
	 * carries `retry: "transient"`, so a flaky upstream retries itself.
	 */
	const stats = AdminShell.useQuery(client.stats.overview, {}, { staleTime: 60_000 });

	if (posts.state !== "success" || categories.state !== "success") {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-8">
				<h1 className="mb-8 font-bold text-3xl">Admin Dashboard</h1>
				<div className="animate-pulse text-neutral-400">Loading…</div>
			</div>
		);
	}

	const postRows = posts.value;
	const postCounts = new Map<string | null, number>();
	for (const post of postRows) {
		postCounts.set(post.categorySlug, (postCounts.get(post.categorySlug) ?? 0) + 1);
	}

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<h1 className="mb-8 font-bold text-3xl">Admin Dashboard</h1>

			<CategoryManager categories={categories.value} postCounts={postCounts} />

			<PostsTable
				posts={postRows}
				categories={categories.value}
				pageviewsBySlug={stats.state === "success" ? stats.value.pageviewsBySlug : {}}
			/>

			<div className="mt-8">
				{stats.state === "success" ? (
					<VisitsChart daily={stats.value.daily} weekly={stats.value.weekly} />
				) : (
					<div className="rounded-lg border p-6">
						<h2 className="mb-4 font-semibold text-xl">Visits</h2>
						<div className="text-red-600">
							{stats.state === "failure"
								? "Stats are unavailable right now."
								: "Loading stats…"}
						</div>
					</div>
				)}
			</div>

			<div className="mt-8">
				<BrokenLinksPanel />
			</div>
		</div>
	);
}
