import { Theater } from "@/components/theater";
import { decodeCategory, decodePost, withDb } from "@/db";
import type { Metadata } from "@/src/lib/metadata";
import { Suspense } from "react";
import { Albums } from "./_components/albums";
import { Hero } from "./_components/hero";
import { PostList } from "./_components/post-list";
import { RecentShows } from "./_components/shows";

export async function generateMetadata({
	searchParams,
}: {
	searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
	const { category } = await searchParams;

	if (category) {
		const cat = (
			await withDb((db) =>
				db
					.selectFrom("category")
					.selectAll()
					.where("slug", "=", category)
					.executeTakeFirst(),
			)
		).unwrap();
		if (cat) {
			return {
				title: `${cat.label} — Jökull Sólberg`,
				alternates: { canonical: `/?category=${category}` },
			};
		}
	}

	return {
		title: "Jökull Sólberg",
		alternates: { canonical: "/" },
	};
}

function AlbumsSkeleton() {
	return (
		<div className="-mx-6">
			<div className="inline-flex gap-3 overflow-y-auto px-6 md:grid md:w-full md:grid-cols-5 md:overflow-y-visible">
				{Array.from({ length: 5 }, (_, i) => (
					<div
						key={i}
						className="aspect-square w-24 animate-pulse rounded-sm bg-stone-300 sm:w-32 md:w-full"
					/>
				))}
			</div>
		</div>
	);
}

function ShowsSkeleton() {
	return (
		<div className="-mx-6 flex gap-3 overflow-y-auto px-6 sm:grid sm:grid-cols-3 md:grid-cols-5 *:shrink-0 sm:*:w-auto">
			{Array.from({ length: 5 }, (_, i) => (
				<div key={i} className="flex flex-col gap-1 shadow-lg">
					<div className="w-full overflow-hidden rounded">
						<div className="aspect-10/16 h-full w-24 animate-pulse rounded bg-stone-300 sm:w-32" />
					</div>
				</div>
			))}
		</div>
	);
}

export default async function Page() {
	// Fetch posts, categories and comment counts — one per-request database
	// for the whole page.
	const { posts, categories, commentCountsMap } = await withDb(async (db) => {
		const posts = (
			await db
				.selectFrom("post")
				.selectAll()
				.where("public_at", "is not", null)
				.orderBy("public_at", "desc")
				.execute()
		)
			.unwrap()
			.map(decodePost);

		// Fetch all categories
		const categories = (await db.selectFrom("category").selectAll().execute())
			.unwrap()
			.map(decodeCategory);

		// Get comment counts for all posts
		const commentCounts = (
			await db
				.selectFrom("comment")
				.select((eb) => ["post_slug", eb.fn.countAll<number>().as("count")])
				.where("is_hidden", "=", 0)
				.groupBy("post_slug")
				.execute()
		).unwrap();

		const commentCountsMap = commentCounts.reduce(
			(acc, item) => {
				acc[item.post_slug] = item.count;
				return acc;
			},
			{} as Record<string, number>,
		);

		return { posts, categories, commentCountsMap };
	});

	return (
		<div className="relative isolate">
			<div
				aria-hidden="true"
				className="hero-orb hero-orb-1 -top-48 -left-28 -z-10 pointer-events-none absolute h-[27rem] w-[27rem] rounded-full bg-sky-200/35 blur-[100px]"
			/>
			<div
				aria-hidden="true"
				className="hero-orb hero-orb-2 -top-40 -z-10 pointer-events-none absolute left-[25rem] h-[24rem] w-[24rem] rounded-full bg-blue-400/30 blur-[110px]"
			/>

			<Hero />

			<Suspense fallback={null}>
				<PostList
					posts={posts.map((post) => {
						// public_at is guaranteed non-null by the SQL filter above.
						const publicAt = post.publicAt!;
						// PostList's Post contract, nothing more: a Temporal.PlainDate
						// is not RSC-serializable, so it degrades to a Date at UTC
						// midnight (Flight's native Date encoding); markdown must
						// never cross to the client. The render shape, not the model.
						return {
							slug: post.slug,
							title: post.title,
							locale: post.locale,
							categorySlug: post.categorySlug,
							publicAt: new Date(
								Date.UTC(publicAt.year, publicAt.month - 1, publicAt.day),
							),
						};
					})}
					commentCounts={commentCountsMap}
					categories={categories}
				/>
			</Suspense>

			<div className="mb-7 max-w-xl">
				<Theater>
					<Suspense fallback={<AlbumsSkeleton />}>
						<Albums />
					</Suspense>
				</Theater>
			</div>

			<div className="mb-7 max-w-xl">
				<Theater>
					<Suspense fallback={<ShowsSkeleton />}>
						<RecentShows />
					</Suspense>
				</Theater>
			</div>
		</div>
	);
}
