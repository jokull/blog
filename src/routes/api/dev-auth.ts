import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import { getSession } from "@/auth";

export const Route = createFileRoute("/api/dev-auth")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (env.NODE_ENV !== "development") {
					return Response.json({ error: "Not available in production" }, { status: 403 });
				}

				const url = new URL(request.url);
				const session = await getSession();
				session.githubUsername = "jokull";
				await session.save();

				const nextUrl = url.searchParams.get("next") ?? "/";
				return Response.redirect(new URL(nextUrl, request.url).toString(), 302);
			},
		},
	},
});
