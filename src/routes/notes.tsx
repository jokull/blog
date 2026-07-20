import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";
import { asHead, staticPageHead } from "@/src/lib/seo";

export const Route = createFileRoute("/notes")({
	validateSearch: (search: Record<string, unknown>) => ({
		cursor: typeof search.cursor === "string" ? search.cursor : undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => renderLegacyRoute({ data: { route: "notes", search: deps } }),
	head: () =>
		asHead(staticPageHead("Notes — Jökull Sólberg", "Curated links and commentary", "/notes")),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
