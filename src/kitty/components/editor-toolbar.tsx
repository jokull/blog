"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ThemeView } from "../lib/types";
import { oklchToString } from "../lib/color-utils";
import { colorLabels, isColorKey } from "../lib/types";

export type EditorMode = "view" | "edit" | "draft";

interface EditorToolbarProps {
	theme: ThemeView;
	mode: EditorMode;
	isOwner: boolean;
	hasUnsavedChanges: boolean;
	isPending: boolean;
	onEnterEdit: () => void;
	onCancelEdit: () => void;
	onSave: () => void;
	onDiscard: () => void;
	onPublish: () => void;
	onFork: () => void;
	onDelete: () => void;
}

export function EditorToolbar({
	theme,
	mode,
	isOwner,
	hasUnsavedChanges,
	isPending,
	onEnterEdit,
	onCancelEdit,
	onSave,
	onDiscard,
	onPublish,
	onFork,
	onDelete,
}: EditorToolbarProps) {
	const [copied, setCopied] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const generateConfig = () => {
		const lines: string[] = [];

		lines.push(`## name: ${theme.name}`);
		if (theme.authorGithubUsername) {
			lines.push(`## author: ${theme.authorGithubUsername}`);
		}
		if (theme.blurb) {
			lines.push(`## blurb: ${theme.blurb}`);
		}
		lines.push("");
		lines.push("# Use Display P3 for wide gamut");
		lines.push("macos_colorspace displayp3");
		lines.push("");
		lines.push("# ANSI colors (OKLCH - adjust L/C/H independently)");

		for (let i = 0; i <= 15; i++) {
			const key = `color${i}`;
			if (!isColorKey(key)) continue;
			const color = theme.colors[key];
			const label = colorLabels[key];
			const paddedKey = key.padEnd(8);
			lines.push(`${paddedKey} ${oklchToString(color)}    # ${label}`);
		}

		lines.push("");
		lines.push("# Basic colors (OKLCH - perceptually uniform)");
		lines.push(`foreground               ${oklchToString(theme.colors.foreground)}`);
		lines.push(`background               ${oklchToString(theme.colors.background)}`);
		lines.push(`cursor                   ${oklchToString(theme.colors.cursor)}`);
		lines.push(`cursor_text_color        background`);
		lines.push(`selection_foreground     ${oklchToString(theme.colors.selection_foreground)}`);
		lines.push(`selection_background     ${oklchToString(theme.colors.selection_background)}`);

		return lines.join("\n");
	};

	const handleExport = async () => {
		const config = generateConfig();
		await navigator.clipboard.writeText(config);
		setCopied(true);
		setTimeout(() => {
			setCopied(false);
		}, 2000);
	};

	return (
		<div className="sticky top-0 z-10 bg-bg border-b border-border px-6 py-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{/* Left side buttons - primary actions */}
					{mode === "view" && !isOwner && (
						<Button intent="primary" size="sm" onPress={onFork} isDisabled={isPending}>
							Fork
						</Button>
					)}
					{mode === "view" && isOwner && (
						<Button
							intent="primary"
							size="sm"
							onPress={onEnterEdit}
							isDisabled={isPending}
						>
							Edit
						</Button>
					)}
					{mode === "edit" && (
						<>
							<Button
								intent="primary"
								size="sm"
								onPress={onSave}
								isDisabled={!hasUnsavedChanges || isPending}
							>
								{isPending ? "Saving..." : "Save"}
							</Button>
							<Button
								intent="outline"
								size="sm"
								onPress={onCancelEdit}
								isDisabled={isPending}
							>
								Cancel
							</Button>
						</>
					)}
					{mode === "draft" && (
						<>
							<Button
								intent="primary"
								size="sm"
								onPress={onSave}
								isDisabled={isPending}
							>
								{isPending ? "Saving..." : "Save"}
							</Button>
							<Button
								intent="outline"
								size="sm"
								onPress={onDiscard}
								isDisabled={isPending}
							>
								Discard
							</Button>
						</>
					)}
				</div>

				<div className="flex items-center gap-2">
					{/* Right side buttons - secondary actions */}
					{mode === "edit" && (
						<>
							<Button
								intent={theme.isPublished ? "outline" : "secondary"}
								size="sm"
								onPress={onPublish}
								isDisabled={isPending || confirmingDelete}
							>
								{theme.isPublished ? "Unpublish" : "Publish"}
							</Button>
							{confirmingDelete ? (
								<>
									<Button
										intent="danger"
										size="sm"
										onPress={() => {
											setConfirmingDelete(false);
											onDelete();
										}}
										isDisabled={isPending}
									>
										Confirm
									</Button>
									<Button
										intent="outline"
										size="sm"
										onPress={() => {
											setConfirmingDelete(false);
										}}
										isDisabled={isPending}
									>
										Cancel
									</Button>
								</>
							) : (
								<Button
									intent="danger"
									size="sm"
									onPress={() => {
										setConfirmingDelete(true);
									}}
									isDisabled={isPending}
								>
									Delete
								</Button>
							)}
						</>
					)}
					<Button
						intent="outline"
						size="sm"
						onPress={() => {
							void handleExport();
						}}
					>
						{copied ? "Copied!" : "Export"}
					</Button>
				</div>
			</div>

			{/* Unsaved changes indicator */}
			{(mode === "edit" || mode === "draft") && hasUnsavedChanges && (
				<div className="text-xs text-warning mt-2">You have unsaved changes</div>
			)}
		</div>
	);
}
