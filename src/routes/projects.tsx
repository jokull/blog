import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/projects")({
	loader: () => renderLegacyRoute({ data: { route: "projects" } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
