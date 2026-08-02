import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/auth";
import { redirect } from "@/src/lib/http";

export const Route = createFileRoute("/api/dev-auth")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!import.meta.env.DEV) {
					return Response.json({ error: "Not available in production" }, { status: 403 });
				}

				const url = new URL(request.url);
				const session = await getSession();
				session.githubUsername = "jokull";
				await session.save();

				const nextUrl = url.searchParams.get("next") ?? "/";
				return redirect(new URL(nextUrl, request.url).toString());
			},
		},
	},
});
