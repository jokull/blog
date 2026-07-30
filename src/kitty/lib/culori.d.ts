declare module "culori/fn" {
	export interface Color {
		mode: string;
		l?: number;
		c?: number;
		h?: number;
		r?: number;
		g?: number;
		b?: number;
		alpha?: number;
	}

	export function formatCss(color: Color | undefined): string;
	export function formatHex(color: Color | undefined): string;
	export function useMode(mode: any): (color: Partial<Color>) => Color | undefined;
	export function parse(color: string): Color | undefined;
	export const modeOklch: any;
}
