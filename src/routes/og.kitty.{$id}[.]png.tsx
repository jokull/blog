import { createFileRoute } from "@tanstack/react-router";
import { appServerClient } from "@/src/rpc/server";
import { ogImage } from "@/src/lib/og";
import { themeErrors } from "@/src/kitty/errors";

export const Route = createFileRoute("/og/kitty/{$id}.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const id = Number(params.id);
				if (!Number.isInteger(id)) return new Response("Not Found", { status: 404 });

				// The same procedure the browser calls, so an unpublished theme
				// stays hidden here too — no second visibility rule to keep in sync.
				const theme = await appServerClient().themes.byId({ id });
				if (theme.isErr()) {
					const { status, body } = themeErrors.notFound.is(theme.error)
						? ({ status: 404, body: "Not Found" } as const)
						: ({ status: 503, body: "Unavailable" } as const);
					return new Response(body, { status });
				}

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
