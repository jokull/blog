// Brand blue palette — 5 shades from dark to light
// Matches CSS vars --chart-1 through --chart-5
export const BLUE = {
	900: "oklch(0.488 0.243 264.376)", // --chart-1 (darkest)
	700: "oklch(0.546 0.245 262.881)", // --primary
	500: "oklch(0.623 0.214 259.815)", // --chart-2
	300: "oklch(0.707 0.165 254.624)", // --chart-3
	200: "oklch(0.809 0.105 251.813)", // --chart-4
	100: "oklch(0.882 0.059 254.128)", // --chart-5 (lightest)
} as const;

export const PALETTE = [BLUE[700], BLUE[300], BLUE[100], BLUE[500], BLUE[900]] as const;

export const GRID_COLOR = "oklch(0.911 0.006 286.286)"; // --border
export const TEXT_COLOR = "oklch(0.552 0.016 285.938)"; // --muted-fg
export const AXIS_COLOR = "oklch(0.705 0.015 286.067)";
