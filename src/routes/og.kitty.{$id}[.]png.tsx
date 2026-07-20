import { createFileRoute } from "@tanstack/react-router";
import { getThemeById } from "@/app/kitty/actions";
import { ogImage } from "@/src/lib/og";

export const Route = createFileRoute("/og/kitty/{$id}.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const theme = Number.isInteger(Number(params.id))
					? await getThemeById(Number(params.id))
					: null;
				if (!theme) return new Response("Not Found", { status: 404 });
				return ogImage({
					title: theme.authorGithubUsername
						? `${theme.name} by ${theme.authorGithubUsername}`
						: theme.name,
					description: theme.blurb ?? "A color theme for the Kitty terminal emulator.",
					kicker: "Kitty Theme Builder",
				});
			},
		},
	},
});
