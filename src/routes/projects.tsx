import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";
import { asHead, staticPageHead } from "@/src/lib/seo";

export const Route = createFileRoute("/projects")({
	loader: () => renderLegacyRoute({ data: { route: "projects" } }),
	head: () =>
		asHead(
			staticPageHead(
				"Projects — Jökull Sólberg",
				"Things I've built — mostly for Iceland.",
				"/projects",
			),
		),
	component: Page,
});

function Page() {
	return <>{Route.useLoaderData()}</>;
}
