import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/ui")({
	loader: () => renderLegacyRoute({ data: { route: "ui" } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
