import { createFileRoute } from "@tanstack/react-router";
import { db, decodePost } from "@/db";
import { extractFirstParagraph } from "@/lib/mdx-content-utils";
import { ogImage } from "@/src/lib/og";

export const Route = createFileRoute("/og/blog/$slug")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				if (params.slug === "site") {
					return ogImage({
						title: "Jökull Sólberg",
						description: "Web development, technology, and software engineering",
					});
				}

				const row = (
					await db
						.selectFrom("post")
						.selectAll()
						.where("slug", "=", params.slug)
						.executeTakeFirst()
				).unwrap();
				if (!row?.public_at) return new Response("Not Found", { status: 404 });
				const post = decodePost(row);
				const description = (await extractFirstParagraph(post.markdown))
					.replace(/\s+/g, " ")
					.slice(0, 140);

				return ogImage({
					title: post.title,
					description: description || `Read ${post.title} on Jökull Sólberg's blog.`,
					kicker: `Jökull Sólberg · ${post.publishedAt.toLocaleDateString(post.locale, { dateStyle: "long" })}`,
				});
			},
		},
	},
});
