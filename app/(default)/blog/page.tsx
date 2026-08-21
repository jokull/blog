import { db, decodeCategory, decodePost } from "@/db";
import type { Metadata } from "@/src/lib/metadata";
import { PostList } from "../_components/post-list";

export async function generateMetadata({
	searchParams,
}: {
	searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
	const { category } = await searchParams;

	if (category) {
		const cat = (
			await db
				.selectFrom("category")
				.selectAll()
				.where("slug", "=", category)
				.executeTakeFirst()
		).unwrap();
		if (cat) {
			return {
				title: `${cat.label} — Jökull Sólberg`,
				alternates: { canonical: `/blog?category=${category}` },
			};
		}
	}

	return {
		title: "Blog — Jökull Sólberg",
		description: "Long-form posts about web development, technology, and software engineering",
		alternates: { canonical: "/blog" },
	};
}

export default async function BlogPage({
	searchParams,
}: {
	searchParams: Promise<{ category?: string }>;
}) {
	await searchParams;

	// Fetch all posts with category information
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

	return (
		<div className="max-w-xl">
			<h1 className="mb-8 font-medium text-lg">Blog</h1>
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
				columns={false}
			/>
		</div>
	);
}
