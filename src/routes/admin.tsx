import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/admin")({
	loader: () => renderLegacyRoute({ data: { route: "admin" } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
