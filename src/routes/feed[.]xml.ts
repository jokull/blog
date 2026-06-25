import { createFileRoute } from "@tanstack/react-router";
import RSS, { type ItemOptions } from "rss";
import { db } from "@/db";
import { env } from "@/env";
import { extractFirstParagraph } from "@/lib/mdx-content-utils";
import { extractFirstImage, normalizeImageUrl } from "@/lib/mdx-image-extractor";

export const Route = createFileRoute("/feed.xml")({
	server: {
		handlers: {
			GET: async () => {
				const baseUrl = env.SITE_URL;
				const feed = new RSS({
					title: "Jökull Sólberg",
					description:
						"Personal blog about web development, technology, and occasional thoughts",
					generator: "RSS for Node and TanStack Start",
					feed_url: `${baseUrl}/feed.xml`,
					site_url: baseUrl,
					managingEditor: "jokull@solberg.is (Jökull Sólberg)",
					webMaster: "jokull@solberg.is (Jökull Sólberg)",
					copyright: `Copyright ${new Date().getFullYear()} Jökull Sólberg`,
					language: "en-US",
					pubDate: new Date().toUTCString(),
					ttl: 60,
				});

				const posts = await db.query.Post.findMany({
					where: { publicAt: { isNotNull: true } },
					orderBy: { publishedAt: "desc" },
					limit: 20,
				});

				for (const post of posts) {
					const description = await extractFirstParagraph(post.markdown);
					const extractedImage =
						post.heroImage ?? (await extractFirstImage(post.markdown));
					const heroImageUrl = extractedImage
						? normalizeImageUrl(extractedImage, baseUrl)
						: null;

					const feedItem: ItemOptions = {
						title: post.title,
						description: description || post.title,
						url: `${baseUrl}/${post.slug}`,
						guid: post.slug,
						date: post.publishedAt,
						author: "jokull@solberg.is (Jökull Sólberg)",
						...(heroImageUrl
							? {
									enclosure: {
										url: heroImageUrl,
										type: getMimeType(heroImageUrl),
									},
								}
							: {}),
					};
					feed.item(feedItem);
				}

				return new Response(feed.xml({ indent: true }), {
					headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
				});
			},
		},
	},
});

function getMimeType(url: string): string {
	const extension = url.split(".").pop()?.toLowerCase();
	switch (extension) {
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "gif":
			return "image/gif";
		case "webp":
			return "image/webp";
		case "svg":
			return "image/svg+xml";
		case "avif":
			return "image/avif";
		default:
			return "image/jpeg";
	}
}
