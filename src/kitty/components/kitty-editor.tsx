import { useNextRouter as useRouter } from "@/src/lib/navigation";
import { useCallback, useEffect, useState } from "react";
import { defaultThemeColors } from "../lib/default-theme";
import type { ColorKey, OklchColor, ThemeView } from "../lib/types";
import { KittyThemeModel } from "../models";
import { client } from "../rpc-client";
import { SessionShell, SignInShell, dispatch } from "../shells";
import { EditorToolbar, type EditorMode } from "./editor-toolbar";
import { useKittyContext } from "./kitty-context";
import { ThemeEditor } from "./theme-editor";

interface KittyEditorProps {
	initialTheme: ThemeView;
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
	const viewer = SessionShell.use();
	const { setHasUnsavedChanges } = useKittyContext();

	const [mode, setMode] = useState<EditorMode>(initialMode);
	const [currentTheme, setCurrentTheme] = useState(initialTheme);
	const [savedTheme, setSavedTheme] = useState(initialTheme);
	const [selectedColor, setSelectedColor] = useState<ColorKey>("color1");

	const themeId = currentTheme.id;
	const isOwner = currentTheme.authorGithubUsername === viewer?.username;
	const hasUnsavedChanges =
		currentTheme.name !== savedTheme.name ||
		currentTheme.blurb !== savedTheme.blurb ||
		JSON.stringify(currentTheme.colors) !== JSON.stringify(savedTheme.colors);

	/**
	 * Attribution for a forked theme. This replaced a `useEffect` that fired a
	 * bare fetch and dropped the result on the floor if it failed; it is a
	 * cached query now, and if the source theme is already in the cache
	 * (because it is in the sidebar) it costs no request at all.
	 */
	const forkedFrom = SignInShell.useQuery(
		client.themes.byId,
		{ id: currentTheme.forkedFromId ?? 0 },
		{ enabled: currentTheme.forkedFromId !== null, staleTime: 5 * 60_000 },
	);

	/**
	 * Saving patches the entity everywhere it is cached — the sidebar row's
	 * title and Draft badge update on keystroke-commit, before the request
	 * settles. `updateEntity` returns its own rollback, which `onFailure`
	 * applies if the server disagrees.
	 */
	const save = SignInShell.useMutation(client.themes.update, {
		optimistic: (input, cache) => ({
			rollback: cache.updateEntity(KittyThemeModel, input.id, () => ({
				name: input.name,
				blurb: input.blurb,
				colors: input.colors,
			})),
		}),
		onSuccess: (theme) => {
			setSavedTheme(theme);
			setCurrentTheme(theme);
			setMode((previous) => (previous === "draft" ? "edit" : previous));
		},
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	const togglePublish = SignInShell.useMutation(client.themes.togglePublish, {
		optimistic: (input, cache) => {
			const next = !currentTheme.isPublished;
			return {
				rollback: cache.updateEntity(KittyThemeModel, input.id, () => ({
					isPublished: next,
				})),
			};
		},
		onSuccess: (theme) => {
			setSavedTheme(theme);
			setCurrentTheme(theme);
		},
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	const goToTheme = useCallback(
		(theme: ThemeView) => {
			setHasUnsavedChanges(false);
			void router.push(`/kitty/${theme.id}`);
		},
		[router, setHasUnsavedChanges],
	);

	const fork = SignInShell.useMutation(client.themes.fork, { onSuccess: goToTheme });
	const create = SignInShell.useMutation(client.themes.create, { onSuccess: goToTheme });
	const remove = SignInShell.useMutation(client.themes.remove, {
		onSuccess: () => {
			setHasUnsavedChanges(false);
			void router.push("/kitty");
		},
	});

	const isPending =
		save.state === "pending" ||
		togglePublish.state === "pending" ||
		fork.state === "pending" ||
		create.state === "pending" ||
		remove.state === "pending";

	useEffect(() => {
		setHasUnsavedChanges(hasUnsavedChanges && (mode === "edit" || mode === "draft"));
	}, [hasUnsavedChanges, mode, setHasUnsavedChanges]);

	// Reset when navigating between themes.
	useEffect(() => {
		setCurrentTheme(initialTheme);
		setSavedTheme(initialTheme);
		setMode(initialMode);
	}, [initialTheme, initialMode]);

	const handleSave = useCallback(() => {
		if (themeId === null) return;
		dispatch(
			save.mutate({
				id: themeId,
				name: currentTheme.name,
				blurb: currentTheme.blurb,
				colors: currentTheme.colors,
			}),
		);
	}, [themeId, currentTheme, save]);

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

	/**
	 * A community theme or the default palette has no row to fork, so it is
	 * copied into a new theme instead. Neither branch checks for a viewer —
	 * SignInShell owns that outcome.
	 */
	const handleFork = () => {
		if (isCommunityTheme || themeId === null) {
			dispatch(
				create.mutate({
					name: `${currentTheme.name} (Remix)`,
					blurb: currentTheme.blurb,
					colors: currentTheme.colors,
				}),
			);
			return;
		}
		dispatch(fork.mutate({ id: themeId }));
	};

	const handleCreateNew = () => {
		dispatch(
			create.mutate({ name: "Untitled Theme", blurb: null, colors: defaultThemeColors }),
		);
	};

	const handleDelete = () => {
		if (themeId === null) return;
		dispatch(remove.mutate({ id: themeId }));
	};

	const handleColorChange = (colorKey: ColorKey, newColor: OklchColor) => {
		setCurrentTheme((prev) => ({
			...prev,
			colors: { ...prev.colors, [colorKey]: newColor },
		}));
	};

	const editorProps = {
		theme: currentTheme,
		selectedColor,
		onSelectColor: setSelectedColor,
		onColorChange: handleColorChange,
		onUpdateName: (name: string) => {
			setCurrentTheme((prev) => ({ ...prev, name }));
		},
		onUpdateBlurb: (blurb: string) => {
			setCurrentTheme((prev) => ({ ...prev, blurb }));
		},
	};

	return (
		<>
			<EditorToolbar
				theme={currentTheme}
				mode={mode}
				isOwner={isOwner}
				hasUnsavedChanges={hasUnsavedChanges}
				isPending={isPending}
				onEnterEdit={() => {
					if (canEdit) setMode("edit");
				}}
				onCancelEdit={() => {
					setCurrentTheme(savedTheme);
					setMode("view");
				}}
				onSave={handleSave}
				onDiscard={() => {
					setHasUnsavedChanges(false);
					void router.push("/kitty");
				}}
				onPublish={() => {
					if (themeId !== null) dispatch(togglePublish.mutate({ id: themeId }));
				}}
				onFork={handleFork}
				onDelete={handleDelete}
			/>

			{save.state === "failure" && <SaveFailure tag={save.error._tag} />}

			{showEmptyState ? (
				<EmptyState
					{...editorProps}
					onFork={handleFork}
					onCreateNew={handleCreateNew}
					isPending={isPending}
				/>
			) : (
				<ThemeEditor
					{...editorProps}
					mode={mode}
					forkedFrom={forkedFrom.state === "success" ? forkedFrom.value : null}
				/>
			)}
		</>
	);
}

/**
 * `auth/required` is absent from this union — SignInShell claims it — so
 * these are the only two outcomes a save can present here, and adding a case
 * for anything else is a type error.
 */
function SaveFailure({ tag }: { tag: "theme/not-found" | "theme/not-owner" }) {
	return (
		<div role="alert" className="px-4 py-2 text-sm text-danger">
			{tag === "theme/not-owner"
				? "This theme belongs to someone else — fork it to make changes."
				: "This theme no longer exists."}
		</div>
	);
}

interface EmptyStateProps {
	theme: ThemeView;
	selectedColor: ColorKey;
	onSelectColor: (key: ColorKey) => void;
	onColorChange: (key: ColorKey, color: OklchColor) => void;
	onUpdateName: (name: string) => void;
	onUpdateBlurb: (blurb: string) => void;
	onFork: () => void;
	onCreateNew: () => void;
	isPending: boolean;
}

function EmptyState({ onFork, onCreateNew, isPending, ...editorProps }: EmptyStateProps) {
	return (
		<div className="relative">
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
						<button
							type="button"
							onClick={onCreateNew}
							disabled={isPending}
							className="px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted/10 transition-colors disabled:opacity-50"
						>
							Start from scratch
						</button>
					</div>
					<p className="text-sm text-muted-fg mt-4">
						Or browse themes in the sidebar to find inspiration
					</p>
				</div>
			</div>

			<div className="opacity-30 pointer-events-none">
				<ThemeEditor {...editorProps} mode="view" forkedFrom={null} />
			</div>
		</div>
	);
}
