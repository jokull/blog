import { createFileRoute } from "@tanstack/react-router";
import { kittyServerClient } from "@/src/kitty/rpc-server";
import { ogImage } from "@/src/lib/og";

export const Route = createFileRoute("/og/kitty/{$id}.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const id = Number(params.id);
				if (!Number.isInteger(id)) return new Response("Not Found", { status: 404 });

				// The same procedure the browser calls, so an unpublished theme
				// stays hidden here too — no second visibility rule to keep in sync.
				const theme = await kittyServerClient().themes.byId({ id });
				if (!theme.ok) return new Response("Not Found", { status: 404 });

				return ogImage({
					title: theme.value.authorGithubUsername
						? `${theme.value.name} by ${theme.value.authorGithubUsername}`
						: theme.value.name,
					description:
						theme.value.blurb ?? "A color theme for the Kitty terminal emulator.",
					kicker: "Kitty Theme Builder",
				});
			},
		},
	},
});
