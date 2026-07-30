import type { OklchColor } from "./types";

export function oklchToString(color: OklchColor): string {
	return `oklch(${color.l.toFixed(4)} ${color.c.toFixed(4)} ${color.h.toFixed(1)})`;
}

export function oklchToCss(color: OklchColor): string {
	return `oklch(${(color.l * 100).toFixed(2)}% ${color.c.toFixed(4)} ${color.h.toFixed(1)}deg)`;
}

export function oklchToRgb(color: OklchColor): string {
	// For now, return CSS OKLCH which browsers can render
	return oklchToCss(color);
}
