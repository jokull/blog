/**
 * The palette, declared once.
 *
 * This module is imported by BOTH the Drizzle column type in schema.ts and
 * the wire model in models.ts, so the JSON stored in D1 and the JSON on the
 * wire are the same declaration rather than two hand-kept copies. That is
 * what makes `KittyThemeModel.$satisfies<StoredKittyTheme>()`
 * hold over the `colors` column instead of only over the scalars.
 *
 * It imports nothing but result-rpc, so schema.ts pulling it in costs the
 * client bundle nothing (and the import is type-only there anyway).
 */
import { wire, type InputOf } from "result-rpc";

/** OKLCH: perceptually uniform, which is why the editor works in it. */
export const OklchColorCodec = wire.object({
	l: wire.number,
	c: wire.number,
	h: wire.number,
});
export type OklchColor = InputOf<typeof OklchColorCodec>;

/** The 16 ANSI colours plus the 5 basics Kitty names separately. */
export const ThemeColorsCodec = wire.object({
	color0: OklchColorCodec,
	color1: OklchColorCodec,
	color2: OklchColorCodec,
	color3: OklchColorCodec,
	color4: OklchColorCodec,
	color5: OklchColorCodec,
	color6: OklchColorCodec,
	color7: OklchColorCodec,
	color8: OklchColorCodec,
	color9: OklchColorCodec,
	color10: OklchColorCodec,
	color11: OklchColorCodec,
	color12: OklchColorCodec,
	color13: OklchColorCodec,
	color14: OklchColorCodec,
	color15: OklchColorCodec,
	foreground: OklchColorCodec,
	background: OklchColorCodec,
	cursor: OklchColorCodec,
	selection_foreground: OklchColorCodec,
	selection_background: OklchColorCodec,
});
export type ThemeColors = InputOf<typeof ThemeColorsCodec>;
