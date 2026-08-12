import { createFileRoute, redirect } from "@tanstack/react-router";
import { KittyEditor } from "@/src/kitty/components/kitty-editor";
import { defaultThemeView } from "@/src/kitty/lib/default-theme";
import { communityFileToSlug } from "@/src/kitty/lib/theme-parser";
import { asHead, pageHead } from "@/src/lib/seo";

export const Route = createFileRoute("/kitty/")({
	// Returning the key only when present keeps it OPTIONAL in the generated
	// search type — otherwise every `<Link to="/kitty">` in the app has to
	// pass `search={{ theme: undefined }}`.
	validateSearch: (search: Record<string, unknown>): { theme?: string } =>
		typeof search.theme === "string" ? { theme: search.theme } : {},
	// Backwards compatibility for the pre-route-segment `?theme=` URLs.
	beforeLoad: ({ search }) => {
		if (!search.theme) return;
		if (search.theme.startsWith("community:")) {
			const slug = communityFileToSlug(search.theme.slice("community:".length));
			throw redirect({ href: `/kitty/community/${slug}` });
		}
		const id = parseInt(search.theme, 10);
		if (!Number.isNaN(id)) {
			throw redirect({ href: `/kitty/${id}` });
		}
	},
	head: () =>
		asHead(
			pageHead({
				title: "Kitty Theme Builder",
				description:
					"Create and share beautiful color themes for the Kitty terminal emulator using an intuitive OKLCH color editor.",
				path: "/kitty",
				image: "/og/blog/site",
			}),
		),
	component: KittyIndex,
});

function KittyIndex() {
	// The empty state previews NightOwl Chroma — an unsaved theme, which is
	// exactly what a nullable-id ThemeView is for.
	return <KittyEditor initialTheme={defaultThemeView()} initialMode="view" showEmptyState />;
}
