import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/kitty/$id")({
	loader: ({ params }) => renderLegacyRoute({ data: { route: "kitty-id", id: params.id } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
