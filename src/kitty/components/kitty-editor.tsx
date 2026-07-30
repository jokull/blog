import { Form, reset, submit, useField, useForm } from "@formisch/react";
import { useNextRouter as useRouter } from "@/src/lib/navigation";
import { useCallback, useEffect, useState } from "react";
import { defaultThemeColors } from "../lib/default-theme";
import type { ColorKey, OklchColor, ThemeColors, ThemeView } from "../lib/types";
import { KittyThemeModel } from "../models";
import { client } from "../rpc-client";
import { ThemeMetaSchema, toThemeInput } from "../schemas";
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
	const [identity, setIdentity] = useState(initialTheme);
	const [colors, setColors] = useState<ThemeColors>(initialTheme.colors);
	const [savedColors, setSavedColors] = useState<ThemeColors>(initialTheme.colors);
	const [selectedColor, setSelectedColor] = useState<ColorKey>("color1");

	/**
	 * The metadata form. Name and blurb live in the form store rather than in
	 * React state, so Formisch owns their validation, dirtiness and per-field
	 * errors. The 21 colours are not form inputs — they are edited through
	 * canvas sliders — so they stay in state beside it.
	 */
	const metaForm = useForm({
		schema: ThemeMetaSchema,
		initialInput: { name: initialTheme.name, blurb: initialTheme.blurb ?? "" },
	});

	// Reactive reads, so the toolbar's .conf export and the live preview show
	// what is currently typed rather than the last saved value.
	const nameField = useField(metaForm, { path: ["name"] });
	const blurbField = useField(metaForm, { path: ["blurb"] });
	const typedName = nameField.input ?? "";
	const typedBlurb = blurbField.input ?? "";

	const themeId = identity.id;
	const isOwner = identity.authorGithubUsername === viewer?.username;
	const colorsDirty = JSON.stringify(colors) !== JSON.stringify(savedColors);
	const hasUnsavedChanges = metaForm.isDirty || colorsDirty;

	/** What the rest of the tree renders: saved identity + live edits. */
	const currentTheme: ThemeView = {
		...identity,
		name: typedName,
		blurb: typedBlurb === "" ? null : typedBlurb,
		colors,
	};

	/**
	 * Attribution for a forked theme. This replaced a `useEffect` that fired a
	 * bare fetch and dropped the result on the floor if it failed; it is a
	 * cached query now, and if the source theme is already in the cache
	 * (because it is in the sidebar) it costs no request at all.
	 */
	const forkedFrom = SignInShell.useQuery(
		client.themes.byId,
		{ id: identity.forkedFromId ?? 0 },
		{ enabled: identity.forkedFromId !== null, staleTime: 5 * 60_000 },
	);

	/**
	 * Saving patches the entity everywhere it is cached — the sidebar row's
	 * title and Draft badge update before the request settles. `updateEntity`
	 * returns its own rollback, which `onFailure` applies if the server
	 * disagrees.
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
			setIdentity(theme);
			setColors(theme.colors);
			setSavedColors(theme.colors);
			// Rebase the form's initial input so it stops reporting dirty.
			reset(metaForm, {
				initialInput: { name: theme.name, blurb: theme.blurb ?? "" },
			});
			setMode((previous) => (previous === "draft" ? "edit" : previous));
		},
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	const togglePublish = SignInShell.useMutation(client.themes.togglePublish, {
		optimistic: (input, cache) => {
			const next = !identity.isPublished;
			return {
				rollback: cache.updateEntity(KittyThemeModel, input.id, () => ({
					isPublished: next,
				})),
			};
		},
		onSuccess: (theme) => {
			setIdentity(theme);
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
		setIdentity(initialTheme);
		setColors(initialTheme.colors);
		setSavedColors(initialTheme.colors);
		setMode(initialMode);
		reset(metaForm, {
			initialInput: { name: initialTheme.name, blurb: initialTheme.blurb ?? "" },
		});
	}, [initialTheme, initialMode, metaForm]);

	/**
	 * Submitting is the single save path — the toolbar button and Cmd+S both
	 * route through it, so neither can skip validation. `onSubmit` only runs
	 * once the schema passes, which is why it receives a parsed `meta` rather
	 * than raw strings.
	 */
	const handleSubmit = (meta: { name: string; blurb: string }) => {
		if (themeId === null) return;
		dispatch(save.mutate({ id: themeId, ...toThemeInput(meta), colors }));
	};

	const requestSave = useCallback(() => {
		submit(metaForm);
	}, [metaForm]);

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
					requestSave();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [mode, hasUnsavedChanges, isPending, requestSave]);

	/**
	 * A community theme or the default palette has no row to fork, so it is
	 * copied into a new theme instead. Neither branch checks for a viewer —
	 * SignInShell owns that outcome.
	 */
	const handleFork = () => {
		if (isCommunityTheme || themeId === null) {
			dispatch(
				create.mutate({
					name: `${typedName} (Remix)`.slice(0, 60),
					blurb: typedBlurb === "" ? null : typedBlurb,
					colors,
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
		setColors((prev) => ({ ...prev, [colorKey]: newColor }));
	};

	const editorProps = {
		form: metaForm,
		theme: currentTheme,
		selectedColor,
		onSelectColor: setSelectedColor,
		onColorChange: handleColorChange,
	};

	return (
		<Form of={metaForm} onSubmit={handleSubmit}>
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
					reset(metaForm);
					setColors(savedColors);
					setMode("view");
				}}
				onSave={requestSave}
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
		</Form>
	);
}

/**
 * `auth/required` is absent from this union — SignInShell claims it — and so
 * is `server/bad-request`, which the DefectShell claims and escalates. These
 * are the only two outcomes a save can present here, and adding a case for
 * anything else is a type error.
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

type EditorProps = Parameters<typeof ThemeEditor>[0];

interface EmptyStateProps extends Omit<EditorProps, "mode" | "forkedFrom"> {
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
