/**
 * Parsing for the upstream kovidgoyal/kitty-themes repository.
 *
 * The fetching that used to live here moved into the `community.*` procedures
 * in ../rpc-server.ts, where the failures are declared instead of thrown past
 * a `catch { console.error }`. What remains is pure: hex -> OKLCH, the
 * `themes.json` index shape, and the `.conf` grammar.
 */
import { oklch } from "culori";
import { z } from "zod";
import type { CommunityTheme } from "../models";
import { isColorKey, type ColorKey, type OklchColor, type ThemeColors } from "./types";

/** Wire codecs decode to readonly shapes; parsing needs somewhere to write. */
type MutableColors = { -readonly [K in ColorKey]?: OklchColor };

/**
 * Convert a community theme file path to a URL slug.
 * "themes/NightOwl.conf" -> "nightowl"
 */
export function communityFileToSlug(file: string): string {
	return file
		.replace(/^themes\//, "")
		.replace(/\.conf$/, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function hexToOklchColor(hex: string): OklchColor {
	const color = oklch(hex);
	if (!color) return { l: 0.5, c: 0.1, h: 0 };
	return {
		l: typeof color.l === "number" ? color.l : 0.5,
		c: typeof color.c === "number" ? color.c : 0.1,
		h: typeof color.h === "number" ? color.h : 0,
	};
}

const themeIndexSchema = z.array(
	z.object({
		name: z.string(),
		file: z.string(),
		is_dark: z.boolean().optional(),
		author: z.string().optional(),
		blurb: z.string().optional(),
		license: z.string().optional(),
		upstream: z.string().optional(),
	}),
);

/**
 * Normalises the upstream index into the wire shape: the slug is derived once
 * here rather than recomputed at every call site, and `undefined` is narrowed
 * to `null` because the wire distinguishes them.
 */
export function themeIndexEntries(payload: unknown): CommunityTheme[] {
	return themeIndexSchema.parse(payload).map((entry) => ({
		slug: communityFileToSlug(entry.file),
		file: entry.file,
		name: entry.name,
		author: entry.author ?? null,
		blurb: entry.blurb ?? null,
		isDark: entry.is_dark ?? null,
	}));
}

/** Extracts `## name:` / `## blurb:` metadata and the colour assignments. */
export function parseThemeConfig(configText: string): {
	name?: string;
	blurb?: string;
	colors: Partial<ThemeColors>;
} {
	const colors: MutableColors = {};
	let name = "";
	let author = "";
	let blurb = "";

	for (const line of configText.split("\n")) {
		const trimmed = line.trim();

		if (trimmed.startsWith("## name:")) {
			name = trimmed.replace("## name:", "").trim();
		} else if (trimmed.startsWith("## author:")) {
			author = trimmed.replace("## author:", "").trim();
		} else if (trimmed.startsWith("## blurb:")) {
			blurb = trimmed.replace("## blurb:", "").trim();
		}

		const colorMatch = trimmed.match(
			/^(color\d+|foreground|background|cursor|selection_foreground|selection_background)\s+(.+)$/,
		);
		if (colorMatch) {
			const [, key, value] = colorMatch;
			const hexValue = value.trim();
			if (hexValue.startsWith("#") && isColorKey(key)) {
				colors[key] = hexToOklchColor(hexValue);
			}
		}
	}

	return {
		...(name ? { name } : {}),
		...(blurb ? { blurb: author ? `${blurb} by ${author}` : blurb } : {}),
		colors,
	};
}
