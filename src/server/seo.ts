import { createServerFn } from "@tanstack/react-start";
import { getThemeById } from "@/app/kitty/actions";
import { findCommunityThemeBySlug } from "@/app/kitty/_lib/slug-utils";
import { fetchThemesList } from "@/app/kitty/_lib/theme-parser";
import { db } from "@/db";
import { extractFirstParagraph } from "@/lib/mdx-content-utils";
import { homeHead, pageHead, postHead } from "@/src/lib/seo";

export const getPostHead = createServerFn({ method: "GET" })
	.validator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const post = await db.query.Post.findFirst({ where: { slug: data.slug } });
		if (!post?.publicAt)
			return pageHead({
				title: "Not found",
				description: "Page not found",
				path: `/${data.slug}`,
			});
		return postHead({ ...post, markdown: await extractFirstParagraph(post.markdown) });
	});

export const getHomeHead = createServerFn({ method: "GET" })
	.validator((data: { category?: string }) => data)
	.handler(async ({ data }) => {
		const category = data.category
			? await db.query.Category.findFirst({
					where: { slug: data.category },
					columns: { slug: true, label: true },
				})
			: null;
		return homeHead(category);
	});

export const getKittyThemeHead = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const id = Number(data.id);
		const theme = Number.isInteger(id) ? await getThemeById(id) : null;
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
		const theme = findCommunityThemeBySlug(await fetchThemesList(), data.slug);
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
