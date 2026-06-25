import type { Metadata } from "@/src/lib/metadata";
import { throwNotFound } from "@/src/lib/router-control";
import { defaultTheme } from "../../_lib/default-theme";
import { findCommunityThemeBySlug } from "../../_lib/slug-utils";
import { fetchThemeConfig, fetchThemesList, parseThemeConfig } from "../../_lib/theme-parser";
import type { KittyTheme } from "../../_lib/types";
import { KittyEditor } from "../../_components/kitty-editor";

export const dynamic = "force-dynamic";

interface PageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params;

	try {
		const themes = await fetchThemesList();
		const meta = findCommunityThemeBySlug(themes, slug);

		if (!meta) {
			return { title: "Theme Not Found | Kitty Theme Builder" };
		}

		const title = meta.author ? `${meta.name} by ${meta.author}` : meta.name;
		const description =
			meta.blurb ?? `${meta.name} - A community color theme for the Kitty terminal emulator.`;

		return {
			title: `${title} | Kitty Theme Builder`,
			description,
			openGraph: {
				title,
				description,
				type: "website",
			},
			twitter: {
				card: "summary_large_image",
				title,
				description,
			},
		};
	} catch {
		return { title: "Theme Not Found | Kitty Theme Builder" };
	}
}

export default async function CommunityThemePage({ params }: PageProps) {
	const { slug } = await params;

	const themes = await fetchThemesList();
	const meta = findCommunityThemeBySlug(themes, slug);

	if (!meta) {
		throwNotFound();
	}

	// Fetch and parse the theme config from GitHub
	const configText = await fetchThemeConfig(meta.file);
	const parsed = parseThemeConfig(configText);

	const theme: KittyTheme = {
		id: null,
		slug: "",
		name: parsed.name ?? meta.name,
		blurb: parsed.blurb ?? meta.blurb ?? null,
		authorGithubId: 0,
		authorGithubUsername: meta.author ?? "",
		authorAvatarUrl: "",
		isPublished: false,
		forkedFromId: null,
		createdAt: new Date(),
		modifiedAt: null,
		colors: {
			...defaultTheme.colors,
			...parsed.colors,
		},
	};

	return <KittyEditor initialTheme={theme} initialMode="view" isCommunityTheme />;
}
