import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";
import { asHead, pageHead } from "@/src/lib/seo";
import { getPostHead } from "@/src/server/seo";
import type { ReactNode } from "react";

export const Route = createFileRoute("/$slug")({
	loader: async ({ params }) => ({
		content: await renderLegacyRoute({ data: { route: "post", slug: params.slug } }),
		head: asHead(await getPostHead({ data: { slug: params.slug } })),
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
					title: "Jökull Sólberg",
					description:
						"Personal blog about web development, technology, and software engineering",
					path: "/",
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
