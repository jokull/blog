import { createServerFn } from "@tanstack/react-start";
import type { BrokenLink } from "@/lib/link-checker";

// Category CRUD
export const createCategory = createServerFn({ method: "POST" })
	.validator((data: { slug: string; label: string }) => data)
	.handler(async ({ data }) => {
		const [{ requireAuth }, { db }, { Category }, { revalidatePath }] = await Promise.all([
			import("@/auth"),
			import("@/db"),
			import("@/schema"),
			import("@/src/lib/revalidate"),
		]);
		await requireAuth();

		// Validate slug format
		if (!/^[a-z0-9-]+$/.test(data.slug)) {
			throw new Error("Slug must contain only lowercase letters, numbers, and hyphens");
		}

		// Check for duplicate
		const existing = await db.query.Category.findFirst({
			where: { slug: data.slug },
		});
		if (existing) {
			throw new Error("Category slug already exists");
		}

		await db.insert(Category).values({ slug: data.slug, label: data.label });
		revalidatePath("/admin");
	});

export const deleteCategory = createServerFn({ method: "POST" })
	.validator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const [{ requireAuth }, { db }, { Category, Post }, { eq, sql }, { revalidatePath }] =
			await Promise.all([
				import("@/auth"),
				import("@/db"),
				import("@/schema"),
				import("drizzle-orm"),
				import("@/src/lib/revalidate"),
			]);
		await requireAuth();

		// Check post count
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(Post)
			.where(eq(Post.categorySlug, data.slug));

		const count = result[0]?.count ?? 0;
		if (count > 0) {
			throw new Error(`Cannot delete category with ${count} post(s)`);
		}

		await db.delete(Category).where(eq(Category.slug, data.slug));
		revalidatePath("/admin");
	});

// Post mutations
export const togglePostPublished = createServerFn({ method: "POST" })
	.validator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const [{ requireAuth }, { db }, { Post }, { eq }, { revalidatePath }] = await Promise.all([
			import("@/auth"),
			import("@/db"),
			import("@/schema"),
			import("drizzle-orm"),
			import("@/src/lib/revalidate"),
		]);
		await requireAuth();

		const post = await db.query.Post.findFirst({
			where: { slug: data.slug },
		});

		if (!post) throw new Error("Post not found");

		await db
			.update(Post)
			.set({
				publicAt: post.publicAt ? null : new Date(),
				modifiedAt: new Date(),
			})
			.where(eq(Post.slug, data.slug));

		revalidatePath("/admin");
		revalidatePath("/(default)");
		revalidatePath(`/(default)/${data.slug}`);
	});

export const updatePostCategory = createServerFn({ method: "POST" })
	.validator((data: { slug: string; categorySlug: string | null }) => data)
	.handler(async ({ data }) => {
		const [{ requireAuth }, { db }, { Post }, { eq }, { revalidatePath }] = await Promise.all([
			import("@/auth"),
			import("@/db"),
			import("@/schema"),
			import("drizzle-orm"),
			import("@/src/lib/revalidate"),
		]);
		await requireAuth();

		// Validate category exists if not null
		if (data.categorySlug) {
			const category = await db.query.Category.findFirst({
				where: { slug: data.categorySlug },
			});
			if (!category) throw new Error("Category not found");
		}

		await db
			.update(Post)
			.set({
				categorySlug: data.categorySlug,
				modifiedAt: new Date(),
			})
			.where(eq(Post.slug, data.slug));

		revalidatePath("/admin");
	});

export const runLinkChecker = createServerFn({ method: "POST" }).handler(
	async (): Promise<BrokenLink[]> => {
		const [{ requireAuth }, { db }, { env }, { checkPostLinks }] = await Promise.all([
			import("@/auth"),
			import("@/db"),
			import("@/env"),
			import("@/lib/link-checker"),
		]);
		await requireAuth();
		const posts = await db.query.Post.findMany();
		return checkPostLinks(posts, env.SITE_URL);
	},
);
