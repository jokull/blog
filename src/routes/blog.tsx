import { createFileRoute } from "@tanstack/react-router";
import { renderLegacyRoute } from "@/src/server/render-route";
import { asHead, pageHead } from "@/src/lib/seo";
import { getBlogHead } from "@/src/server/seo";
import type { ReactNode } from "react";

export const Route = createFileRoute("/blog")({
	validateSearch: (search: Record<string, unknown>) => ({
		category: typeof search.category === "string" ? search.category : undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => ({
		content: await renderLegacyRoute({ data: { route: "blog", search: deps } }),
		head: asHead(await getBlogHead({ data: { category: deps.category } })),
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
					title: "Blog — Jökull Sólberg",
					description:
						"Long-form posts about web development, technology, and software engineering",
					path: "/blog",
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
