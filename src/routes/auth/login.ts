import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/auth";
import { redirect } from "@/src/lib/http";

export const Route = createFileRoute("/auth/login")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				await requireAuth(url.searchParams.get("next") ?? "/");
				return redirect(new URL("/", request.url).toString());
			},
		},
	},
});
