"use client";

import { useNextRouter as useRouter } from "@/src/lib/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { fetchThemesList, type ThemeMetadata } from "../_lib/theme-parser";
import type { KittyTheme } from "../_lib/types";

export type SidebarTab = "community" | "published" | "my-themes";

const sidebarTabs = new Set<string>(["community", "published", "my-themes"]);
export function isSidebarTab(key: unknown): key is SidebarTab {
	return typeof key === "string" && sidebarTabs.has(key);
}

interface KittyContextValue {
	// Server-provided data
	publishedThemes: KittyTheme[];
	userThemes: KittyTheme[];
	username?: string;
	isAdmin: boolean;

	// Client-side state
	communityThemes: ThemeMetadata[] | null;
	communityLoading: boolean;
	activeTab: SidebarTab;
	hasUnsavedChanges: boolean;

	// Actions
	setActiveTab: (tab: SidebarTab) => void;
	setHasUnsavedChanges: (value: boolean) => void;
	loadCommunityThemes: () => Promise<void>;
	refreshThemes: () => void;
}

const KittyContext = createContext<KittyContextValue | null>(null);

interface KittyProviderProps {
	children: ReactNode;
	publishedThemes: KittyTheme[];
	userThemes: KittyTheme[];
	username?: string;
	isAdmin: boolean;
	initialTab?: SidebarTab;
}

export function KittyProvider({
	children,
	publishedThemes,
	userThemes,
	username,
	isAdmin,
	initialTab,
}: KittyProviderProps) {
	const router = useRouter();

	// Client state
	const [communityThemes, setCommunityThemes] = useState<ThemeMetadata[] | null>(null);
	const [communityLoading, setCommunityLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<SidebarTab>(
		initialTab ?? (username ? "my-themes" : "published"),
	);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const loadCommunityThemes = useCallback(async () => {
		if (communityThemes !== null || communityLoading) return;
		setCommunityLoading(true);
		try {
			const themes = await fetchThemesList();
			setCommunityThemes(themes);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Failed to load community themes:", error);
		} finally {
			setCommunityLoading(false);
		}
	}, [communityThemes, communityLoading]);

	const refreshThemes = useCallback(() => {
		void router.refresh();
	}, [router]);

	return (
		<KittyContext.Provider
			value={{
				publishedThemes,
				userThemes,
				username,
				isAdmin,
				communityThemes,
				communityLoading,
				activeTab,
				hasUnsavedChanges,
				setActiveTab,
				setHasUnsavedChanges,
				loadCommunityThemes,
				refreshThemes,
			}}
		>
			{children}
		</KittyContext.Provider>
	);
}

export function useKittyContext() {
	const context = useContext(KittyContext);
	if (!context) {
		throw new Error("useKittyContext must be used within a KittyProvider");
	}
	return context;
}
