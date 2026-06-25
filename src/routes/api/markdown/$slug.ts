import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";

export const Route = createFileRoute("/api/markdown/$slug")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const post = await db.query.Post.findFirst({
					where: { slug: params.slug },
				});

				if (!post?.publicAt) {
					return new Response("Not Found", { status: 404 });
				}

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
