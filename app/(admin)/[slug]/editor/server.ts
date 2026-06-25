import { createServerFn } from "@tanstack/react-start";
import type { InferSelectModel } from "drizzle-orm";
import { Post } from "@/schema";
import { throwNotFound } from "@/src/lib/router-control";

async function getPostOrThrow(slug: string) {
	const { db } = await import("@/db");
	const post = await db.query.Post.findFirst({ where: { slug } });
	if (!post) {
		throwNotFound();
	}
	return post;
}

export const previewPost = createServerFn({ method: "POST" })
	.validator(
		(data: {
			slug: string;
			previewMarkdown: InferSelectModel<typeof Post>["previewMarkdown"];
		}) => data,
	)
	.handler(async ({ data }) => {
		const [{ requireAuth }, { db }, { eq }, { extractFirstImage }, { revalidatePath }] =
			await Promise.all([
				import("@/auth"),
				import("@/db"),
				import("drizzle-orm"),
				import("@/lib/mdx-image-extractor"),
				import("@/src/lib/revalidate"),
			]);
		await requireAuth();
		await getPostOrThrow(data.slug);

		const heroImage = data.previewMarkdown
			? await extractFirstImage(data.previewMarkdown)
			: null;

		await db
			.update(Post)
			.set({ previewMarkdown: data.previewMarkdown, heroImage })
			.where(eq(Post.slug, data.slug));
		revalidatePath("/(admin)/[slug]/editor", "page");
	});

export const togglePublishPost = createServerFn({ method: "POST" })
	.validator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const [{ requireAuth }, { db }, { eq }, { extractFirstImage }, { revalidatePath }] =
			await Promise.all([
				import("@/auth"),
				import("@/db"),
				import("drizzle-orm"),
				import("@/lib/mdx-image-extractor"),
				import("@/src/lib/revalidate"),
			]);
		await requireAuth();
		const post = await getPostOrThrow(data.slug);
		const isCurrentlyPublished = post.publicAt !== null;

		const newMarkdown = isCurrentlyPublished
			? post.markdown
			: (post.previewMarkdown ?? post.markdown);
		const heroImage = newMarkdown ? await extractFirstImage(newMarkdown) : post.heroImage;

		await db
			.update(Post)
			.set({
				publicAt: isCurrentlyPublished ? null : new Date(),
				markdown: newMarkdown,
				previewMarkdown: null,
				heroImage,
			})
			.where(eq(Post.slug, data.slug));

		revalidatePath("/(admin)/[slug]/editor", "page");
		revalidatePath("/(default)/[slug]", "page");
		revalidatePath("/(default)", "page");
	});

export const updatePost = createServerFn({ method: "POST" })
	.validator(
		(
			data: { slug: string } & Pick<
				InferSelectModel<typeof Post>,
				"title" | "publishedAt" | "locale" | "previewMarkdown"
			>,
		) => data,
	)
	.handler(async ({ data }) => {
		const [{ requireAuth }, { db }, { eq }, { extractFirstImage }, { revalidatePath }] =
			await Promise.all([
				import("@/auth"),
				import("@/db"),
				import("drizzle-orm"),
				import("@/lib/mdx-image-extractor"),
				import("@/src/lib/revalidate"),
			]);
		await requireAuth();
		const post = await getPostOrThrow(data.slug);

		const newMarkdown = data.previewMarkdown ?? post.markdown;
		const heroImage = newMarkdown ? await extractFirstImage(newMarkdown) : post.heroImage;

		await db
			.update(Post)
			.set({
				title: data.title,
				publishedAt: data.publishedAt,
				locale: data.locale,
				markdown: newMarkdown,
				previewMarkdown: null,
				heroImage,
				modifiedAt: new Date(),
			})
			.where(eq(Post.slug, data.slug));

		revalidatePath("/(admin)/[slug]/editor", "page");
		revalidatePath("/(default)/[slug]", "page");
		revalidatePath("/(default)", "page");
	});
