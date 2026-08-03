import { createFileRoute } from "@tanstack/react-router";
import { appServerClient } from "@/src/rpc/server";
import { ogImage } from "@/src/lib/og";

export const Route = createFileRoute("/og/kitty/community/{$slug}.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const index = await appServerClient().community.list({});
				if (index.isErr()) return new Response("Unavailable", { status: 503 });

				const theme = index.value.find((entry) => entry.slug === params.slug);
				if (!theme) return new Response("Not Found", { status: 404 });

				return ogImage({
					title: theme.author ? `${theme.name} by ${theme.author}` : theme.name,
					description:
						theme.blurb ?? "A community color theme for the Kitty terminal emulator.",
					kicker: "Kitty Theme Builder",
				});
			},
		},
	},
});
