import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(
					[
						"User-agent: *",
						"Allow: /",
						"Disallow: /admin",
						"Disallow: /api/",
						"Disallow: /*/editor",
						`Sitemap: ${env.SITE_URL}/sitemap.xml`,
						"",
					].join("\n"),
					{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
				),
		},
	},
});
