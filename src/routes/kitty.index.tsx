import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/kitty/")({
	validateSearch: (search: Record<string, unknown>) => ({
		theme: typeof search.theme === "string" ? search.theme : undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => renderLegacyRoute({ data: { route: "kitty", search: deps } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
