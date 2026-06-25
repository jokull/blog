import type { Metadata } from "@/src/lib/metadata";
import { throwRedirect } from "@/src/lib/router-control";
import { defaultTheme } from "./_lib/default-theme";
import { communityFileToSlug } from "./_lib/slug-utils";
import { KittyEditor } from "./_components/kitty-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Kitty Theme Builder",
	description:
		"Create and share beautiful color themes for the Kitty terminal emulator using an intuitive OKLCH color editor.",
	openGraph: {
		title: "Kitty Theme Builder",
		description:
			"Create and share beautiful color themes for the Kitty terminal emulator using an intuitive OKLCH color editor.",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Kitty Theme Builder",
		description:
			"Create and share beautiful color themes for the Kitty terminal emulator using an intuitive OKLCH color editor.",
	},
};

interface PageProps {
	searchParams: Promise<{ theme?: string }>;
}

export default async function KittyPage({ searchParams }: PageProps) {
	const { theme: themeParam } = await searchParams;

	// Backward compatibility: redirect old URLs to new routes
	if (themeParam) {
		if (themeParam.startsWith("community:")) {
			// "community:themes/NightOwl.conf" -> "/kitty/community/nightowl"
			const communityFile = themeParam.slice("community:".length);
			const slug = communityFileToSlug(communityFile);
			throwRedirect({ href: `/kitty/community/${slug}` });
		} else {
			// "123" -> "/kitty/123"
			const themeId = parseInt(themeParam, 10);
			if (!isNaN(themeId)) {
				throwRedirect({ href: `/kitty/${themeId}` });
			}
		}
	}

	// Empty state with NightOwl Chroma preview
	return <KittyEditor initialTheme={defaultTheme} initialMode="view" showEmptyState />;
}
