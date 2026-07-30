/**
 * Validation rules for theme metadata, declared once in Valibot.
 *
 * These are used twice, deliberately, at two different boundaries:
 *
 *   - the FORM runs them (Formisch, `useForm({ schema })`) to validate a
 *     *human* — progressive per-field feedback before a request exists;
 *   - the WIRE runs them (`wire.standard` in contract.ts) to validate an
 *     *application boundary* — a caller whose client disagrees with ours.
 *
 * That is not duplication: the rules live in one place, and both boundaries
 * close over the same declaration. Before this, neither boundary validated
 * anything — `wire.string` accepted `""`, so a theme could be saved with an
 * empty name.
 *
 * Browser-safe: valibot only.
 */
import * as v from "valibot";

export const ThemeNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "Give your theme a name."),
	v.maxLength(60, "Keep the name under 60 characters."),
);

export const ThemeBlurbSchema = v.pipe(
	v.string(),
	v.trim(),
	v.maxLength(200, "Keep the description under 200 characters."),
);

/**
 * What the human edits — a *projection* of the mutation input, which also
 * carries the theme id and all 21 colours. The two shapes genuinely differ,
 * so they are not forced to share a schema; `toThemeInput` below is where
 * they meet, and that mapping is the honest artifact rather than something
 * to hide.
 */
export const ThemeMetaSchema = v.object({
	name: ThemeNameSchema,
	blurb: ThemeBlurbSchema,
});

export type ThemeMeta = v.InferOutput<typeof ThemeMetaSchema>;

/**
 * Maps the form's output onto the mutation's shape. The only real work is
 * the blurb: a textarea's "empty" is `""`, the column's is `null`.
 */
export function toThemeInput(meta: ThemeMeta) {
	return { name: meta.name, blurb: meta.blurb === "" ? null : meta.blurb };
}
