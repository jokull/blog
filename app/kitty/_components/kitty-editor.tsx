"use client";

import { useNextRouter as useRouter } from "@/src/lib/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useKittyContext } from "../_context/kitty-context";
import { defaultTheme } from "../_lib/default-theme";
import type { ColorKey, KittyTheme, OklchColor } from "../_lib/types";
import {
	createTheme,
	deleteTheme,
	forkTheme,
	getForkedFromTheme,
	togglePublish,
	updateTheme,
} from "../mutations";
import { EditorToolbar, type EditorMode } from "./editor-toolbar";
import { ThemeEditor } from "./theme-editor";

interface KittyEditorProps {
	initialTheme: KittyTheme;
	initialMode?: EditorMode;
	canEdit?: boolean;
	isCommunityTheme?: boolean;
	showEmptyState?: boolean;
}

export function KittyEditor({
	initialTheme,
	initialMode = "view",
	canEdit = false,
	isCommunityTheme = false,
	showEmptyState = false,
}: KittyEditorProps) {
	const router = useRouter();
	const { username, setHasUnsavedChanges, refreshThemes } = useKittyContext();
	const [isPending, startTransition] = useTransition();

	// Editor state
	const [mode, setMode] = useState<EditorMode>(initialMode);
	const [currentTheme, setCurrentTheme] = useState(initialTheme);
	const [savedTheme, setSavedTheme] = useState(initialTheme);
	const [selectedColor, setSelectedColor] = useState<ColorKey>("color1");
	const [forkedFrom, setForkedFrom] = useState<KittyTheme | null>(null);

	// Derived state
	const isOwner = currentTheme.authorGithubUsername === username;
	const hasUnsavedChanges =
		currentTheme.name !== savedTheme.name ||
		currentTheme.blurb !== savedTheme.blurb ||
		JSON.stringify(currentTheme.colors) !== JSON.stringify(savedTheme.colors);

	// Sync unsaved changes to context for navigation warnings
	useEffect(() => {
		setHasUnsavedChanges(hasUnsavedChanges && (mode === "edit" || mode === "draft"));
	}, [hasUnsavedChanges, mode, setHasUnsavedChanges]);

	// Reset state when initialTheme changes (navigation between pages)
	useEffect(() => {
		setCurrentTheme(initialTheme);
		setSavedTheme(initialTheme);
		setMode(initialMode);
		setForkedFrom(null);
	}, [initialTheme, initialMode]);

	// Load forked from theme info
	useEffect(() => {
		if (currentTheme.forkedFromId) {
			void getForkedFromTheme({ data: { forkedFromId: currentTheme.forkedFromId } }).then(
				(theme) => {
					if (theme) setForkedFrom(theme);
				},
			);
		} else {
			setForkedFrom(null);
		}
	}, [currentTheme.forkedFromId]);

	// Warn before leaving with unsaved changes
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges && (mode === "edit" || mode === "draft")) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasUnsavedChanges, mode]);

	// Save handler
	const handleSave = useCallback(() => {
		if (!currentTheme.id) return;

		startTransition(async () => {
			const updated = await updateTheme({
				data: {
					id: currentTheme.id!,
					updates: {
						name: currentTheme.name,
						blurb: currentTheme.blurb,
						colors: currentTheme.colors,
					},
				},
			});
			setSavedTheme(updated);
			setCurrentTheme(updated);
			if (mode === "draft") {
				setMode("edit");
			}
			refreshThemes();
		});
	}, [currentTheme, mode, refreshThemes]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if ((mode === "edit" || mode === "draft") && hasUnsavedChanges && !isPending) {
					handleSave();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [mode, hasUnsavedChanges, isPending, handleSave]);

	// Enter edit mode
	const handleEnterEdit = () => {
		if (!canEdit) return;
		setMode("edit");
	};

	// Cancel edit (revert changes)
	const handleCancelEdit = () => {
		setCurrentTheme(savedTheme);
		setMode("view");
	};

	// Discard draft (navigate back to index)
	const handleDiscard = () => {
		setHasUnsavedChanges(false);
		void router.push("/kitty");
	};

	// Publish/unpublish
	const handlePublish = () => {
		if (!currentTheme.id) return;

		startTransition(async () => {
			const updated = await togglePublish({ data: { id: currentTheme.id! } });
			setCurrentTheme(updated);
			setSavedTheme(updated);
			refreshThemes();
		});
	};

	// Fork theme
	const handleFork = () => {
		if (!username) {
			window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
			return;
		}

		startTransition(async () => {
			let newTheme: KittyTheme;

			if (isCommunityTheme || currentTheme.id === null) {
				// For community themes, create a new theme with the colors
				newTheme = await createTheme({
					data: {
						name: `${currentTheme.name} (Remix)`,
						colors: currentTheme.colors,
						blurb: currentTheme.blurb ?? "",
					},
				});
			} else {
				// For DB themes, use the fork action
				newTheme = await forkTheme({ data: { originalId: currentTheme.id } });
			}

			setHasUnsavedChanges(false);
			refreshThemes();
			void router.push(`/kitty/${newTheme.id}`);
		});
	};

	// Delete theme
	const handleDelete = () => {
		if (!currentTheme.id) return;

		startTransition(async () => {
			await deleteTheme({ data: { id: currentTheme.id! } });
			setHasUnsavedChanges(false);
			refreshThemes();
			void router.push("/kitty");
		});
	};

	// Create new theme (for empty state CTA)
	const handleCreateNew = () => {
		if (!username) {
			window.location.href = `/auth/login?next=/kitty`;
			return;
		}

		startTransition(async () => {
			const newTheme = await createTheme({
				data: {
					name: "Untitled Theme",
					colors: defaultTheme.colors,
					blurb: "",
				},
			});
			refreshThemes();
			void router.push(`/kitty/${newTheme.id}`);
		});
	};

	// Color change handler
	const handleColorChange = (colorKey: ColorKey, newColor: OklchColor) => {
		setCurrentTheme((prev) => ({
			...prev,
			colors: { ...prev.colors, [colorKey]: newColor },
		}));
	};

	// Update name
	const handleUpdateName = (name: string) => {
		setCurrentTheme((prev) => ({ ...prev, name }));
	};

	// Update blurb
	const handleUpdateBlurb = (blurb: string) => {
		setCurrentTheme((prev) => ({ ...prev, blurb }));
	};

	return (
		<>
			<EditorToolbar
				theme={currentTheme}
				mode={mode}
				isOwner={isOwner}
				hasUnsavedChanges={hasUnsavedChanges}
				isPending={isPending}
				onEnterEdit={handleEnterEdit}
				onCancelEdit={handleCancelEdit}
				onSave={handleSave}
				onDiscard={handleDiscard}
				onPublish={handlePublish}
				onFork={handleFork}
				onDelete={handleDelete}
			/>

			{showEmptyState ? (
				<EmptyState
					theme={currentTheme}
					selectedColor={selectedColor}
					onSelectColor={setSelectedColor}
					onColorChange={handleColorChange}
					onUpdateName={handleUpdateName}
					onUpdateBlurb={handleUpdateBlurb}
					onFork={handleFork}
					onCreateNew={handleCreateNew}
					isPending={isPending}
				/>
			) : (
				<ThemeEditor
					theme={currentTheme}
					mode={mode}
					forkedFrom={forkedFrom}
					selectedColor={selectedColor}
					onSelectColor={setSelectedColor}
					onColorChange={handleColorChange}
					onUpdateName={handleUpdateName}
					onUpdateBlurb={handleUpdateBlurb}
				/>
			)}
		</>
	);
}

interface EmptyStateProps {
	theme: KittyTheme;
	selectedColor: ColorKey;
	onSelectColor: (key: ColorKey) => void;
	onColorChange: (key: ColorKey, color: OklchColor) => void;
	onUpdateName: (name: string) => void;
	onUpdateBlurb: (blurb: string) => void;
	onFork: () => void;
	onCreateNew: () => void;
	isPending: boolean;
}

function EmptyState({
	theme,
	selectedColor,
	onSelectColor,
	onColorChange,
	onUpdateName,
	onUpdateBlurb,
	onFork,
	onCreateNew,
	isPending,
}: EmptyStateProps) {
	return (
		<div className="relative">
			{/* Overlay CTA */}
			<div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
				<div className="text-center p-8 max-w-md">
					<h2 className="text-2xl font-bold mb-2">Kitty Theme Builder</h2>
					<p className="text-muted-fg mb-6">
						Create beautiful color themes for the Kitty terminal emulator using an
						intuitive OKLCH color editor.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<button
							type="button"
							onClick={onFork}
							disabled={isPending}
							className="px-6 py-3 bg-primary text-primary-fg rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
						>
							{isPending ? "Creating..." : "Start with NightOwl Chroma"}
						</button>
					</div>
					<p className="text-sm text-muted-fg mt-4">
						Or browse themes in the sidebar to find inspiration
					</p>
				</div>
			</div>

			{/* Background preview (slightly visible) */}
			<div className="opacity-30 pointer-events-none">
				<ThemeEditor
					theme={theme}
					mode="view"
					forkedFrom={null}
					selectedColor={selectedColor}
					onSelectColor={onSelectColor}
					onColorChange={onColorChange}
					onUpdateName={onUpdateName}
					onUpdateBlurb={onUpdateBlurb}
				/>
			</div>
		</div>
	);
}
