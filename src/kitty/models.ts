/**
 * Wire shapes for the Kitty theme browser.
 *
 * `KittyThemeModel` is the entity: keyed by `id`, so every query that returns
 * it (the published list, my-themes, the detail view) is indexed by identity
 * and any mutation returning it patches all of them in place — no refetch, no
 * `revalidatePath("/kitty")`.
 *
 * Community themes are deliberately NOT a model. They come from a GitHub
 * repository and have no identity in this database; they are one-off wire
 * shapes, immune to entity patching by construction.
 */
import { defineModel, wire, type InputOf, type ModelValue } from "result-rpc";
import type { KittyTheme } from "@/schema";
import { OklchColorCodec, ThemeColorsCodec, type OklchColor, type ThemeColors } from "./colors";

export { OklchColorCodec, ThemeColorsCodec };
export type { OklchColor, ThemeColors };

export const KittyThemeModel = defineModel("kitty-theme", {
	key: "id",
	shape: {
		id: wire.number,
		slug: wire.string,
		name: wire.string,
		authorGithubId: wire.number,
		authorGithubUsername: wire.string,
		authorAvatarUrl: wire.string,
		isPublished: wire.boolean,
		forkedFromId: wire.union([wire.number, wire.null]),
		blurb: wire.union([wire.string, wire.null]),
		colors: ThemeColorsCodec,
		createdAt: wire.date,
		modifiedAt: wire.union([wire.date, wire.null]),
	},
}).$satisfies<typeof KittyTheme.$inferSelect>();

/**
 * Every field is public: a theme is a shareable artifact, and the browser
 * needs all 21 colours to render the preview. The type-only Drizzle import is
 * erased, so the schema module never enters the client graph.
 */
export const KittyThemeView = KittyThemeModel.all(
	"a published theme is entirely public — the whole point is sharing it",
);

export type SavedTheme = ModelValue<typeof KittyThemeModel>;

/** One entry of the upstream `themes.json` index. */
export const CommunityThemeCodec = wire.object({
	slug: wire.string,
	file: wire.string,
	name: wire.string,
	author: wire.union([wire.string, wire.null]),
	blurb: wire.union([wire.string, wire.null]),
	isDark: wire.union([wire.boolean, wire.null]),
});
export type CommunityTheme = InputOf<typeof CommunityThemeCodec>;

/** A community theme with its parsed palette, for the detail route. */
export const CommunityThemeDetailCodec = wire.object({
	meta: CommunityThemeCodec,
	colors: ThemeColorsCodec,
});
export type CommunityThemeDetail = InputOf<typeof CommunityThemeDetailCodec>;
