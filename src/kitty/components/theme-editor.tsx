"use client";

import type { ChangeEvent } from "react";
import type { ColorKey, ThemeView, OklchColor } from "../lib/types";
import type { EditorMode } from "./editor-toolbar";
import { TextField } from "@/components/ui/text-field";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ColorSelector } from "./color-selector";
import { ColorEditor } from "./color-editor";
import { ThemePreview } from "./theme-preview";

interface ThemeEditorProps {
	theme: ThemeView;
	mode: EditorMode;
	forkedFrom: ThemeView | null;
	selectedColor: ColorKey;
	onSelectColor: (key: ColorKey) => void;
	onColorChange: (key: ColorKey, color: OklchColor) => void;
	onUpdateName: (name: string) => void;
	onUpdateBlurb: (blurb: string) => void;
}

export function ThemeEditor({
	theme,
	mode,
	forkedFrom,
	selectedColor,
	onSelectColor,
	onColorChange,
	onUpdateName,
	onUpdateBlurb,
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

				{/* Name input */}
				<TextField>
					<Label>Theme Name</Label>
					<Input
						value={theme.name}
						onChange={(e: ChangeEvent<HTMLInputElement>) => {
							onUpdateName(e.target.value);
						}}
						disabled={!isEditing}
						placeholder="My Awesome Theme"
					/>
				</TextField>

				{/* Description - hidden for now */}
				{/* <div>
					<Label htmlFor="blurb">Description</Label>
					<Textarea
						id="blurb"
						value={theme.blurb ?? ""}
						onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
							onUpdateBlurb(e.target.value);
						}}
						disabled={!isEditing}
						placeholder="A brief description of your theme..."
						rows={2}
					/>
				</div> */}
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
