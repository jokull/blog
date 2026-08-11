import { createServerFn } from "@tanstack/react-start";
import { appServerClient } from "@/src/rpc/server";
import { db, decodePost } from "@/db";
import { extractFirstParagraph } from "@/lib/mdx-content-utils";
import { homeHead, pageHead, postHead } from "@/src/lib/seo";

export const getPostHead = createServerFn({ method: "GET" })
	.validator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const row = (
			await db.selectFrom("post").selectAll().where("slug", "=", data.slug).executeTakeFirst()
		).unwrap();
		if (!row?.public_at)
			return pageHead({
				title: "Not found",
				description: "Page not found",
				path: `/${data.slug}`,
			});
		const post = decodePost(row);
		return postHead({ ...post, markdown: await extractFirstParagraph(post.markdown) });
	});

export const getHomeHead = createServerFn({ method: "GET" })
	.validator((data: { category?: string }) => data)
	.handler(async ({ data }) => {
		// db-result#4: `select` returns unwrapped builders, so the projection
		const categorySlug = data.category;
		const category = categorySlug
			? (
					await db
						.selectFrom("category")
						.select(["slug", "label"])
						.where("slug", "=", categorySlug)
						.executeTakeFirst()
				).unwrap()
			: null;
		return homeHead(category);
	});

export const getKittyThemeHead = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const id = Number(data.id);
		const result = Number.isInteger(id) ? await appServerClient().themes.byId({ id }) : null;
		const theme = result?.isOk() ? result.value : null;
		const title = theme
			? `${theme.authorGithubUsername ? `${theme.name} by ${theme.authorGithubUsername}` : theme.name} | Kitty Theme Builder`
			: "Theme Not Found | Kitty Theme Builder";
		return pageHead({
			title,
			description:
				theme?.blurb ??
				"Create and share beautiful color themes for the Kitty terminal emulator.",
			path: `/kitty/${data.id}`,
			image: `/og/kitty/${data.id}`,
		});
	});

export const getCommunityKittyThemeHead = createServerFn({ method: "GET" })
	.validator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const index = await appServerClient().community.list({});
		const theme = index.isOk()
			? (index.value.find((entry) => entry.slug === data.slug) ?? null)
			: null;
		const label = theme?.author ? `${theme.name} by ${theme.author}` : theme?.name;
		return pageHead({
			title: label
				? `${label} | Kitty Theme Builder`
				: "Theme Not Found | Kitty Theme Builder",
			description: theme?.blurb ?? "A community color theme for the Kitty terminal emulator.",
			path: `/kitty/community/${data.slug}`,
			image: `/og/kitty/community/${data.slug}`,
		});
	});
