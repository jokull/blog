import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";
import { asHead, pageHead } from "@/src/lib/seo";
import { getKittyThemeHead } from "@/src/server/seo";
import type { ReactNode } from "react";

export const Route = createFileRoute("/kitty/$id")({
	loader: async ({ params }) => ({
		content: await renderLegacyRoute({ data: { route: "kitty-id", id: params.id } }),
		head: asHead(await getKittyThemeHead({ data: { id: params.id } })),
	}),
	head: ({ loaderData }) => {
		// TanStack Start's server-function serialization currently erases loader types here.
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion
		const data = loaderData as unknown as
			| { head?: import("@/src/lib/seo").SeoHead }
			| undefined;
		return (
			data?.head ??
			asHead(
				pageHead({
					title: "Kitty Theme Builder",
					description:
						"Create and share beautiful color themes for the Kitty terminal emulator.",
					path: "/kitty",
				}),
			)
		);
	},
	component: Page,
});

function Page() {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	const data = Route.useLoaderData() as unknown as { content?: ReactNode } | undefined;
	return <>{data?.content}</>;
}
