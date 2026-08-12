import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { groupBy, pipe } from "remeda";
import { decodePost, withDb } from "@/db";

export const Route = createFileRoute("/llm.txt")({
	server: {
		handlers: {
			GET: async () => {
				const posts = (
					await withDb((db) =>
						db
							.selectFrom("post")
							.selectAll()
							.where("public_at", "is not", null)
							.orderBy("public_at", "desc")
							.execute(),
					)
				)
					.unwrap()
					.map(decodePost);
				const postsByYear = pipe(
					posts,
					groupBy((post) => post.publishedAt.getFullYear().toString()),
				);
				const sortedYears = Object.keys(postsByYear).sort((a, b) => (b > a ? 1 : -1));
				const lines: string[] = ["# Jökull Sólberg's Blog", ""];

				for (const year of sortedYears) {
					lines.push(`## ${year}`, "");
					for (const post of postsByYear[year]) {
						const date = post.publicAt!.toLocaleString(post.locale, {
							year: "numeric",
							month: "short",
							day: "numeric",
						});
						lines.push(`- [${post.title}](${env.SITE_URL}/${post.slug}.md) - ${date}`);
					}
					lines.push("");
				}

				return new Response(lines.join("\n"), {
					headers: {
						"Content-Type": "text/plain; charset=utf-8",
						"Cache-Control":
							"public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
					},
				});
			},
		},
	},
});
