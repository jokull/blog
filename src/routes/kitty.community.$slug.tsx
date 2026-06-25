import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/kitty/community/$slug")({
	loader: ({ params }) =>
		renderLegacyRoute({ data: { route: "kitty-community", slug: params.slug } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
