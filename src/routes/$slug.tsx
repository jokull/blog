import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";

export const Route = createFileRoute("/$slug")({
	loader: ({ params }) => renderLegacyRoute({ data: { route: "post", slug: params.slug } }),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
