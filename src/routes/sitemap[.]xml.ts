import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const posts = (
					await db
						.selectFrom("post")
						.select(["slug", "public_at", "modified_at"])
						.where("public_at", "is not", null)
						.orderBy("public_at", "desc")
						.execute()
				).unwrap();

				const urls = [
					{ loc: env.SITE_URL, lastmod: new Date(), changefreq: "weekly", priority: "1" },
					...posts.map((post) => ({
						loc: `${env.SITE_URL}/${post.slug}`,
						lastmod: post.modified_at
							? new Date(post.modified_at * 1000)
							: new Date(`${post.public_at}T00:00:00Z`),
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
