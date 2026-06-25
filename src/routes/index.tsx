import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>) => ({
		category: typeof search.category === "string" ? search.category : undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => renderLegacyRoute({ data: { route: "home", search: deps } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
