import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";
import { asHead, pageHead } from "@/src/lib/seo";

export const Route = createFileRoute("/kitty/")({
	validateSearch: (search: Record<string, unknown>) => ({
		theme: typeof search.theme === "string" ? search.theme : undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => renderLegacyRoute({ data: { route: "kitty", search: deps } }),
	head: () =>
		asHead(
			pageHead({
				title: "Kitty Theme Builder",
				description:
					"Create and share beautiful color themes for the Kitty terminal emulator using an intuitive OKLCH color editor.",
				path: "/kitty",
				image: "/og/blog/site",
			}),
		),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
