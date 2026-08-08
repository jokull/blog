import { createFileRoute } from "@tanstack/react-router";
import { db, decodePost } from "@/db";

export const Route = createFileRoute("/api/markdown/$slug")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const row = (
					await db
						.selectFrom("post")
						.selectAll()
						.where("slug", "=", params.slug)
						.executeTakeFirst()
				).unwrap();

				if (!row) return new Response("Not Found", { status: 404 });
				const post = decodePost(row);
				if (!post.publicAt) return new Response("Not Found", { status: 404 });

				const formattedDate = post.publicAt.toISOString().split("T")[0];
				const markdownDocument = `# ${post.title}

${formattedDate}

${post.markdown}`;

				return new Response(markdownDocument, {
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
