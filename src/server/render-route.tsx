import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";

type RenderRequest =
	| { route: "home"; search?: { category?: string } }
	| { route: "notes"; search?: { cursor?: string } }
	| { route: "projects" }
	| { route: "post"; slug: string }
	| { route: "admin" }
	| { route: "editor"; slug: string }
	| { route: "kitty"; search?: { theme?: string } }
	| { route: "kitty-id"; id: string }
	| { route: "kitty-community"; slug: string }
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
			case "admin": {
				const [{ default: AdminLayout }, { default: AdminPage }] = await Promise.all([
					import("../../app/(admin)/layout"),
					import("../../app/admin/page"),
				]);
				return renderServerComponent(
					<AdminLayout>
						<AdminPage />
					</AdminLayout>,
				);
			}
			case "editor": {
				const [{ default: AdminLayout }, { default: EditorPage }] = await Promise.all([
					import("../../app/(admin)/layout"),
					import("../../app/(admin)/[slug]/editor/page"),
				]);
				return renderServerComponent(
					<AdminLayout>
						<EditorPage params={promise({ slug: data.slug })} />
					</AdminLayout>,
				);
			}
			case "kitty": {
				const [{ default: KittyLayout }, { default: KittyPage }] = await Promise.all([
					import("../../app/kitty/layout"),
					import("../../app/kitty/page"),
				]);
				return renderServerComponent(
					<KittyLayout>
						<KittyPage searchParams={promise(data.search ?? {})} />
					</KittyLayout>,
				);
			}
			case "kitty-id": {
				const [{ default: KittyLayout }, { default: KittyIdPage }] = await Promise.all([
					import("../../app/kitty/layout"),
					import("../../app/kitty/[id]/page"),
				]);
				return renderServerComponent(
					<KittyLayout>
						<KittyIdPage params={promise({ id: data.id })} />
					</KittyLayout>,
				);
			}
			case "kitty-community": {
				const [{ default: KittyLayout }, { default: KittyCommunityPage }] =
					await Promise.all([
						import("../../app/kitty/layout"),
						import("../../app/kitty/community/[slug]/page"),
					]);
				return renderServerComponent(
					<KittyLayout>
						<KittyCommunityPage params={promise({ slug: data.slug })} />
					</KittyLayout>,
				);
			}
			case "ui": {
				const { default: UiPage } = await import("../../app/ui/page");
				return renderServerComponent(<UiPage />);
			}
		}
	});
