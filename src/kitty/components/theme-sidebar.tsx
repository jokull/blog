import { OctocatIcon } from "@/components/octocat-icon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import { useNextRouter as useRouter, usePathname } from "@/src/lib/navigation";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { defaultThemeColors } from "../lib/default-theme";
import type { ThemeView } from "../lib/types";
import type { CommunityTheme } from "../models";
import { client } from "../rpc-client";
import { SessionShell, SignInShell, signIn } from "../shells";
import { isSidebarTab, useKittyContext } from "./kitty-context";
import { ThemeLink } from "./theme-link";

export function ThemeSidebar() {
	const router = useRouter();
	const pathname = usePathname();
	const { activeTab, setActiveTab, setHasUnsavedChanges } = useKittyContext();
	const [search, setSearch] = useState("");

	// The layer guarantees this is a value, never "still loading": `Viewer | null`.
	const viewer = SessionShell.use();

	// The route loader prefetched these, so the first paint is already success.
	const published = SignInShell.useQuery(client.themes.published, {}, { staleTime: 60_000 });

	// Gated on the viewer. SignInShell claims `auth/required` and reacts by
	// redirecting to GitHub, which is right for a WRITE the user just asked
	// for — but asking "what are my themes?" while signed out must not bounce
	// an anonymous visitor out of the browser. So we simply don't ask.
	const mine = SignInShell.useQuery(
		client.themes.mine,
		{},
		{ enabled: viewer !== null, staleTime: 60_000 },
	);

	// Lazy: only fetched once the Community tab is actually opened.
	const community = SignInShell.useQuery(
		client.community.list,
		{},
		{ enabled: activeTab === "community", staleTime: 5 * 60_000 },
	);

	const createTheme = SignInShell.useMutation(client.themes.create, {
		onSuccess: (theme) => {
			setHasUnsavedChanges(false);
			void router.push(`/kitty/${theme.id}`);
		},
	});

	const currentThemeId = useMemo(() => {
		const match = pathname.match(/^\/kitty\/(\d+)$/);
		return match ? parseInt(match[1], 10) : null;
	}, [pathname]);

	const currentCommunitySlug = useMemo(() => {
		const match = pathname.match(/^\/kitty\/community\/([^/]+)$/);
		return match ? match[1] : null;
	}, [pathname]);

	const publishedThemes = published.state === "success" ? published.value : [];
	const userThemes = mine.state === "success" ? mine.value : [];
	const communityThemes = community.state === "success" ? community.value : [];

	const matches = (haystack: (string | null)[]) => {
		if (!search) return true;
		const lower = search.toLowerCase();
		return haystack.some((value) => value?.toLowerCase().includes(lower));
	};

	const filteredPublished = publishedThemes.filter((t) =>
		matches([t.name, t.authorGithubUsername]),
	);
	const filteredUserThemes = userThemes.filter((t) => matches([t.name, t.authorGithubUsername]));
	const filteredCommunity = communityThemes.filter((t) => matches([t.name, t.author]));

	const handleTabChange = (key: React.Key) => {
		if (!isSidebarTab(key)) return;
		setActiveTab(key);
	};

	// No `if (!viewer)` guard here. Signing in is SignInShell's job: an
	// anonymous click fails with `auth/required`, the shell claims it and
	// redirects, and this continuation never runs.
	const handleCreateNew = () => {
		createTheme.mutate({
			name: "Untitled Theme",
			blurb: null,
			colors: defaultThemeColors,
		});
	};

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-border">
				<ThemeLink href="/kitty" className="block">
					<h1 className="text-lg font-bold mb-4 hover:text-primary transition-colors">
						Kitty Theme Builder
					</h1>
				</ThemeLink>

				<TextField className="mb-3">
					<Label className="sr-only">Search</Label>
					<Input
						placeholder="Search themes..."
						value={search}
						onChange={(e: ChangeEvent<HTMLInputElement>) => {
							setSearch(e.target.value);
						}}
					/>
				</TextField>
			</div>

			<Tabs
				selectedKey={activeTab}
				onSelectionChange={handleTabChange}
				className="flex-1 flex flex-col overflow-hidden"
			>
				<TabList aria-label="Theme categories" className="px-4">
					<Tab id="community">Community</Tab>
					<Tab id="published">Published</Tab>
					{viewer && <Tab id="my-themes">My Themes</Tab>}
				</TabList>

				<TabPanel id="community" className="flex-1 overflow-y-auto p-4">
					{community.state === "pending" && (
						<div className="text-center py-8 text-muted-fg text-sm">
							Loading themes...
						</div>
					)}
					{community.state === "failure" && (
						<div className="text-center py-8 text-muted-fg text-sm">
							The kitty-themes repository is unavailable right now.
							<button
								type="button"
								onClick={() => void community.refetch()}
								className="block mx-auto mt-2 underline"
							>
								Try again
							</button>
						</div>
					)}
					{community.state === "success" && (
						<>
							<CountLabel count={filteredCommunity.length} />
							<div className="space-y-2">
								{filteredCommunity.map((theme) => (
									<CommunityThemeCard
										key={theme.file}
										theme={theme}
										isSelected={currentCommunitySlug === theme.slug}
									/>
								))}
								{filteredCommunity.length === 0 && <EmptyLabel />}
							</div>
						</>
					)}
				</TabPanel>

				<TabPanel id="published" className="flex-1 overflow-y-auto p-4">
					<CountLabel count={filteredPublished.length} />
					<div className="space-y-2">
						{filteredPublished.map((theme) => (
							<ThemeCard
								key={theme.id}
								theme={theme}
								isSelected={currentThemeId === theme.id}
							/>
						))}
						{filteredPublished.length === 0 && <EmptyLabel />}
					</div>
				</TabPanel>

				{viewer && (
					<TabPanel id="my-themes" className="flex-1 overflow-y-auto p-4">
						<CountLabel count={filteredUserThemes.length} />
						<div className="space-y-2">
							{filteredUserThemes.map((theme) => (
								<ThemeCard
									key={theme.id}
									theme={theme}
									isSelected={currentThemeId === theme.id}
								/>
							))}
							{filteredUserThemes.length === 0 && (
								<div className="text-center text-muted-fg py-8 text-sm">
									No themes yet. Create one!
								</div>
							)}
						</div>
					</TabPanel>
				)}
			</Tabs>

			<div className="p-4 border-t border-border">
				{viewer ? (
					<Button
						intent="primary"
						onPress={handleCreateNew}
						isDisabled={createTheme.state === "pending"}
						className="w-full"
					>
						{createTheme.state === "pending" ? "Creating..." : "Create New Theme"}
					</Button>
				) : (
					<Button
						intent="secondary"
						onPress={signIn}
						className="w-full bg-neutral-800 text-neutral-100 hover:bg-neutral-950 hover:text-white"
					>
						<OctocatIcon className="size-5" />
						Sign in with GitHub
					</Button>
				)}
			</div>
		</div>
	);
}

function CountLabel({ count }: { count: number }) {
	return (
		<div className="text-xs text-muted-fg mb-2 uppercase tracking-wide font-semibold">
			{count} {count === 1 ? "theme" : "themes"}
		</div>
	);
}

function EmptyLabel() {
	return <div className="text-center text-muted-fg py-8 text-sm">No themes found</div>;
}

function ThemeCard({ theme, isSelected }: { theme: ThemeView; isSelected: boolean }) {
	return (
		<ThemeLink
			href={`/kitty/${theme.id}`}
			className={`block w-full text-left p-3 rounded-lg border transition-all ${
				isSelected
					? "bg-primary/10 border-primary"
					: "border-border hover:bg-muted/10 hover:border-muted-fg/20"
			}`}
		>
			<div className="font-semibold text-sm mb-1">{theme.name}</div>
			{theme.authorGithubUsername && (
				<div className="text-xs text-muted-fg">by {theme.authorGithubUsername}</div>
			)}
			{theme.blurb && (
				<div className="text-xs text-muted-fg mt-1 line-clamp-2">{theme.blurb}</div>
			)}
			{!theme.isPublished && (
				<div className="text-xs text-warning mt-1 font-semibold">Draft</div>
			)}
		</ThemeLink>
	);
}

function CommunityThemeCard({ theme, isSelected }: { theme: CommunityTheme; isSelected: boolean }) {
	return (
		<ThemeLink
			href={`/kitty/community/${theme.slug}`}
			className={`block w-full text-left p-3 rounded-lg border transition-all ${
				isSelected
					? "bg-primary/10 border-primary"
					: "border-border hover:bg-muted/10 hover:border-muted-fg/20"
			}`}
		>
			<div className="font-semibold text-sm mb-1">{theme.name}</div>
			{theme.author && <div className="text-xs text-muted-fg">by {theme.author}</div>}
			{theme.blurb && (
				<div className="text-xs text-muted-fg mt-1 line-clamp-2">{theme.blurb}</div>
			)}
			{theme.isDark !== null && (
				<div className="text-xs text-muted-fg mt-1">{theme.isDark ? "Dark" : "Light"}</div>
			)}
		</ThemeLink>
	);
}
