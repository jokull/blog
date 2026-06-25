import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/notes")({
	validateSearch: (search: Record<string, unknown>) => ({
		cursor: typeof search.cursor === "string" ? search.cursor : undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => renderLegacyRoute({ data: { route: "notes", search: deps } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
