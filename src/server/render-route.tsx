import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";

type RenderRequest =
	| { route: "home"; search?: { category?: string } }
	| { route: "notes"; search?: { cursor?: string } }
	| { route: "projects" }
	| { route: "post"; slug: string }
	| { route: "ui" };

function promise<T>(value: T) {
	return Promise.resolve(value);
}

export const renderLegacyRoute = createServerFn({ method: "GET" })
	.validator((data: RenderRequest) => data)
	.handler(async ({ data }) => {
		switch (data.route) {
			case "home": {
				const [{ default: DefaultLayout }, { default: HomePage }] = await Promise.all([
					import("../../app/(default)/layout"),
					import("../../app/(default)/page"),
				]);
				return renderServerComponent(
					<DefaultLayout>
						<HomePage />
					</DefaultLayout>,
				);
			}
			case "notes": {
				const [{ default: DefaultLayout }, { default: NotesPage }] = await Promise.all([
					import("../../app/(default)/layout"),
					import("../../app/(default)/notes/page"),
				]);
				return renderServerComponent(
					<DefaultLayout>
						<NotesPage searchParams={promise(data.search ?? {})} />
					</DefaultLayout>,
				);
			}
			case "projects": {
				const [{ default: DefaultLayout }, { default: ProjectsPage }] = await Promise.all([
					import("../../app/(default)/layout"),
					import("../../app/(default)/projects/page"),
				]);
				return renderServerComponent(
					<DefaultLayout>
						<ProjectsPage />
					</DefaultLayout>,
				);
			}
			case "post": {
				const [{ default: DefaultLayout }, { default: BlogPostPage }] = await Promise.all([
					import("../../app/(default)/layout"),
					import("../../app/(default)/[slug]/page"),
				]);
				return renderServerComponent(
					<DefaultLayout>
						<BlogPostPage params={promise({ slug: data.slug })} />
					</DefaultLayout>,
				);
			}
			case "ui": {
				const { default: UiPage } = await import("../../app/ui/page");
				return renderServerComponent(<UiPage />);
			}
		}
	});
