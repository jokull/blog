/**
 * UI-only state for the theme browser.
 *
 * No server data belongs here. Lists come from `useResultQuery`, the viewer
 * comes from `SessionShell`, and mutations returning the entity patch cached
 * rows by identity, so there is nothing to thread down or refresh by hand.
 *
 * What this context holds is genuinely local: which sidebar tab is open, and
 * whether the editor is holding unsaved edits.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type SidebarTab = "community" | "published" | "my-themes";

const sidebarTabs = new Set<string>(["community", "published", "my-themes"]);
export function isSidebarTab(key: unknown): key is SidebarTab {
	return typeof key === "string" && sidebarTabs.has(key);
}

interface KittyContextValue {
	activeTab: SidebarTab;
	setActiveTab: (tab: SidebarTab) => void;
	hasUnsavedChanges: boolean;
	setHasUnsavedChanges: (value: boolean) => void;
}

const KittyContext = createContext<KittyContextValue | null>(null);

export function KittyProvider({
	children,
	initialTab,
}: {
	children: ReactNode;
	initialTab?: SidebarTab;
}) {
	const [activeTab, setActiveTab] = useState<SidebarTab>(initialTab ?? "published");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const value = useMemo(
		() => ({ activeTab, setActiveTab, hasUnsavedChanges, setHasUnsavedChanges }),
		[activeTab, hasUnsavedChanges],
	);

	return <KittyContext.Provider value={value}>{children}</KittyContext.Provider>;
}

export function useKittyContext() {
	const context = useContext(KittyContext);
	if (!context) {
		throw new Error("useKittyContext must be used within a KittyProvider");
	}
	return context;
}
