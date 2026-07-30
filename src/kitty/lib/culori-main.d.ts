declare module "culori" {
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

	export function oklch(color: any): Color | undefined;
	export function formatCss(color: any): string;
	export function formatHex(color: any): string | undefined;
}
