import type { ThemeColors, ThemeView } from "./types";

/**
 * NightOwl Chroma — the palette the empty state previews, and the base every
 * community import is merged over so all 21 colours are always present.
 */
export const defaultThemeColors: ThemeColors = {
	// ANSI colors
	color0: { l: 0.1795, c: 0.0436, h: 243.3 },
	color1: { l: 0.667, c: 0.2421, h: 24.7 },
	color2: { l: 0.7992, c: 0.2344, h: 148 },
	color3: { l: 0.8939, c: 0.1835, h: 97.3 },
	color4: { l: 0.6955, c: 0.1572, h: 268.8 },
	color5: { l: 0.7329, c: 0.1809, h: 307.9 },
	color6: { l: 0.7519, c: 0.1306, h: 173.9 },
	color7: { l: 1.0, c: 0.0, h: 89.9 },
	color8: { l: 0.4541, c: 0.0013, h: 17.2 },
	color9: { l: 0.667, c: 0.2651, h: 24.7 },
	color10: { l: 0.7978, c: 0.2619, h: 147.7 },
	color11: { l: 0.8919, c: 0.2124, h: 96.9 },
	color12: { l: 0.6955, c: 0.1685, h: 268.8 },
	color13: { l: 0.7319, c: 0.196, h: 307.5 },
	color14: { l: 0.7522, c: 0.1828, h: 174.4 },
	color15: { l: 1.0, c: 0.0, h: 89.9 },

	// Basic colors
	foreground: { l: 0.8984, c: 0.0198, h: 260.2 },
	background: { l: 0.189, c: 0.0473, h: 244.7 },
	cursor: { l: 0.6438, c: 0.0631, h: 240.8 },
	selection_foreground: { l: 1.0, c: 0.0, h: 89.9 },
	selection_background: { l: 0.3409, c: 0.0556, h: 244.62 },
};

/** An unsaved theme — hence `id: null`, which is the honest value here. */
export function defaultThemeView(): ThemeView {
	return {
		id: null,
		slug: "",
		name: "NightOwl Chroma",
		blurb: "Extracted with OKLCH - perceptually uniform colors",
		authorGithubId: 0,
		authorGithubUsername: "",
		authorAvatarUrl: "",
		isPublished: false,
		forkedFromId: null,
		createdAt: new Date(),
		modifiedAt: null,
		colors: defaultThemeColors,
	};
}
