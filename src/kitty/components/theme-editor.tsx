import { Field, type FormStore } from "@formisch/react";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import type { ColorKey, OklchColor, ThemeView } from "../lib/types";
import type { ThemeMetaSchema } from "../schemas";
import { ColorEditor } from "./color-editor";
import { ColorSelector } from "./color-selector";
import type { EditorMode } from "./editor-toolbar";
import { ThemePreview } from "./theme-preview";

interface ThemeEditorProps {
	form: FormStore<typeof ThemeMetaSchema>;
	theme: ThemeView;
	mode: EditorMode;
	forkedFrom: ThemeView | null;
	selectedColor: ColorKey;
	onSelectColor: (key: ColorKey) => void;
	onColorChange: (key: ColorKey, color: OklchColor) => void;
}

export function ThemeEditor({
	form,
	theme,
	mode,
	forkedFrom,
	selectedColor,
	onSelectColor,
	onColorChange,
}: ThemeEditorProps) {
	const isEditing = mode === "edit" || mode === "draft";

	return (
		<div className="p-6 space-y-6">
			{/* Theme metadata */}
			<div className="space-y-4">
				{/* Author and status info */}
				<div>
					{theme.authorGithubUsername && (
						<div className="text-sm text-muted-fg mb-1">
							by {theme.authorGithubUsername}
							{theme.isPublished ? (
								<span className="ml-2 text-success font-semibold">Published</span>
							) : (
								<span className="ml-2 text-warning font-semibold">Draft</span>
							)}
						</div>
					)}
					{forkedFrom && (
						<div className="text-xs text-muted-fg">
							Forked from{" "}
							<span className="font-semibold">
								{forkedFrom.name} by {forkedFrom.authorGithubUsername}
							</span>
						</div>
					)}
					{mode === "draft" && !theme.id && (
						<div className="text-xs text-muted-fg">New theme - not saved yet</div>
					)}
				</div>

				{/*
				 * Formisch is headless: `field.props` carries name/ref and the
				 * input/change/blur handlers, and we supply the value and styling.
				 * Errors are per-field, so an empty name surfaces here instead of
				 * being silently saved.
				 */}
				<Field of={form} path={["name"]}>
					{(field) => (
						<TextField isInvalid={field.errors !== null}>
							<Label>Theme Name</Label>
							<Input
								{...field.props}
								value={field.input ?? ""}
								disabled={!isEditing}
								placeholder="My Awesome Theme"
							/>
							{field.errors && (
								<span className="text-xs text-danger mt-1">{field.errors[0]}</span>
							)}
						</TextField>
					)}
				</Field>

				<Field of={form} path={["blurb"]}>
					{(field) => (
						<TextField isInvalid={field.errors !== null}>
							<Label>Description</Label>
							<Textarea
								{...field.props}
								value={field.input ?? ""}
								disabled={!isEditing}
								placeholder="A brief description of your theme..."
								rows={2}
							/>
							{field.errors && (
								<span className="text-xs text-danger mt-1">{field.errors[0]}</span>
							)}
						</TextField>
					)}
				</Field>
			</div>

			{/* Color selector and editor: auto-auto-auto-1fr grid */}
			<div className="grid grid-cols-[auto_auto_auto_1fr] gap-6">
				{/* Three color columns (auto-sized) */}
				<ColorSelector
					theme={theme}
					selectedColor={selectedColor}
					onSelectColor={onSelectColor}
				/>

				{/* Color editor (fills remaining space) - always interactive for preview */}
				<ColorEditor
					color={theme.colors[selectedColor]}
					onColorChange={(newColor) => {
						onColorChange(selectedColor, newColor);
					}}
				/>
			</div>

			{/* Preview */}
			<ThemePreview theme={theme} />
		</div>
	);
}
