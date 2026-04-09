import { Theater } from "@/components/theater";
import { db } from "@/db";
import { Category, Comment, Post } from "@/schema";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
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
		const cat = await db.query.Category.findFirst({
			where: eq(Category.slug, category),
		});
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
	// Fetch all posts with category information
	const posts = await db.query.Post.findMany({
		where: isNotNull(Post.publicAt),
		orderBy: [desc(Post.publishedAt)],
	});

	// Fetch all categories
	const categories = await db.query.Category.findMany();

	// Get comment counts for all posts
	const commentCounts = await db
		.select({
			postSlug: Comment.postSlug,
			count: sql<number>`count(*)`.as("count"),
		})
		.from(Comment)
		.where(eq(Comment.isHidden, false))
		.groupBy(Comment.postSlug);

	const commentCountsMap = commentCounts.reduce(
		(acc, item) => {
			acc[item.postSlug] = item.count;
			return acc;
		},
		{} as Record<string, number>,
	);

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
					posts={posts.map((post) => ({
						...post,
						formattedDate: post.publishedAt.toLocaleDateString(post.locale, {
							year: undefined,
							month: "short",
							day: "numeric",
						}),
						year: post.publishedAt.getFullYear().toString(),
					}))}
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
