import { createFileRoute } from "@tanstack/react-router";
import { findCommunityThemeBySlug } from "@/app/kitty/_lib/slug-utils";
import { fetchThemesList } from "@/app/kitty/_lib/theme-parser";
import { ogImage } from "@/src/lib/og";

export const Route = createFileRoute("/og/kitty/community/{$slug}.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const theme = findCommunityThemeBySlug(await fetchThemesList(), params.slug);
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
