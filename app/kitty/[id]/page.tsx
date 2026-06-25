import type { Metadata } from "@/src/lib/metadata";
import { throwNotFound } from "@/src/lib/router-control";
import { getSession, isAdmin } from "@/auth";
import { getThemeById } from "../actions";
import { KittyEditor } from "../_components/kitty-editor";

export const dynamic = "force-dynamic";

interface PageProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params;
	const themeId = parseInt(id, 10);

	if (isNaN(themeId)) {
		return { title: "Theme Not Found | Kitty Theme Builder" };
	}

	const theme = await getThemeById(themeId);
	if (!theme) {
		return { title: "Theme Not Found | Kitty Theme Builder" };
	}

	const title = theme.authorGithubUsername
		? `${theme.name} by ${theme.authorGithubUsername}`
		: theme.name;
	const description =
		theme.blurb ??
		`${theme.name} - A color theme for the Kitty terminal emulator. Create your own themes with the OKLCH color editor.`;

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
}

export default async function ThemePage({ params }: PageProps) {
	const { id } = await params;
	const themeId = parseInt(id, 10);

	if (isNaN(themeId)) {
		throwNotFound();
	}

	const theme = await getThemeById(themeId);
	if (!theme) {
		throwNotFound();
	}

	// Determine if user can edit
	const session = await getSession();
	const isOwner = theme.authorGithubUsername === session.githubUsername;
	const isAdminUser = await isAdmin();
	const canEdit = isOwner || isAdminUser;

	return <KittyEditor initialTheme={theme} initialMode="view" canEdit={canEdit} />;
}
