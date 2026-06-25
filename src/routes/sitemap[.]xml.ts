import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { env } from "@/env";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const posts = await db.query.Post.findMany({
					where: { publicAt: { isNotNull: true } },
					columns: { slug: true, publishedAt: true, modifiedAt: true },
				});

				const urls = [
					{ loc: env.SITE_URL, lastmod: new Date(), changefreq: "weekly", priority: "1" },
					...posts.map((post) => ({
						loc: `${env.SITE_URL}/${post.slug}`,
						lastmod: post.modifiedAt ?? post.publishedAt,
						changefreq: "monthly",
						priority: "0.8",
					})),
				];

				const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod.toISOString()}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
	)
	.join("\n")}
</urlset>`;

				return new Response(body, {
					headers: { "Content-Type": "application/xml; charset=utf-8" },
				});
			},
		},
	},
});
