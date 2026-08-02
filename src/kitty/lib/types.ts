/**
 * Editor-facing types. The wire shapes live in ../models — these are what the
 * React tree renders, which is a slightly wider thing: the editor also renders
 * themes that were never saved (a community import, the default palette), and
 * those genuinely have no database identity.
 *
 * That is why `ThemeView.id` is nullable while `SavedTheme.id` is not. Keep them
 * apart: one interface with `id: number | null` for both would make every
 * persisted theme carry a null check it can never fail, paid for with a
 * `currentTheme.id!` at each save site.
 */
import type { OklchColor, SavedTheme, ThemeColors } from "../models";

export type { OklchColor, SavedTheme, ThemeColors };

export type ColorKey = keyof ThemeColors;

/** A theme as the editor renders it: saved rows and unsaved drafts alike. */
export interface ThemeView {
	id: number | null;
	slug: string;
	name: string;
	authorGithubId: number;
	authorGithubUsername: string;
	authorAvatarUrl: string;
	blurb: string | null;
	isPublished: boolean;
	forkedFromId: number | null;
	createdAt: Date;
	modifiedAt: Date | null;
	colors: ThemeColors;
}

/** A persisted theme is a view whose id happens to be non-null. */
export function toThemeView(theme: SavedTheme): ThemeView {
	return { ...theme };
}

const colorKeys = new Set<string>([
	"color0",
	"color1",
	"color2",
	"color3",
	"color4",
	"color5",
	"color6",
	"color7",
	"color8",
	"color9",
	"color10",
	"color11",
	"color12",
	"color13",
	"color14",
	"color15",
	"foreground",
	"background",
	"cursor",
	"selection_foreground",
	"selection_background",
]);

export function isColorKey(key: string): key is ColorKey {
	return colorKeys.has(key);
}

export const colorLabels: Record<ColorKey, string> = {
	color0: "Black",
	color1: "Red",
	color2: "Green",
	color3: "Yellow",
	color4: "Blue",
	color5: "Magenta",
	color6: "Cyan",
	color7: "White",
	color8: "Bright Black",
	color9: "Bright Red",
	color10: "Bright Green",
	color11: "Bright Yellow",
	color12: "Bright Blue",
	color13: "Bright Magenta",
	color14: "Bright Cyan",
	color15: "Bright White",
	foreground: "Foreground",
	background: "Background",
	cursor: "Cursor",
	selection_foreground: "Selection Foreground",
	selection_background: "Selection Background",
};
