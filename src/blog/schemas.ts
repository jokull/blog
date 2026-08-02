/**
 * Valibot schemas for everything a human types.
 *
 * One declaration serves three consumers:
 *   - Formisch drives the admin forms from these directly (`useForm({ schema })`)
 *   - `wire.standard(...)` in contract.ts runs the same schema at the wire
 *     boundary, so a hand-rolled fetch cannot post what the form would reject
 *   - the CLI parses argv through them, so `blog create --title ""` fails with
 *     the same message the dialog shows
 *
 * BROWSER-SAFE.
 */
import * as v from "valibot";

/**
 * Post slugs are the primary key and appear in the URL. Deliberately looser
 * than a category slug: posts predate any slug rule and some existing ones
 * carry characters a strict pattern would now reject, so this only forbids what
 * would actually break a route.
 */
export const PostSlugSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "A post needs a slug."),
	v.maxLength(120, "Keep the slug under 120 characters."),
	v.regex(/^[^/\s?#]+$/u, "A slug cannot contain spaces, slashes, ? or #."),
);

export const PostTitleSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "Give the post a title."),
	v.maxLength(200, "Keep the title under 200 characters."),
);

export const LocaleSchema = v.picklist(["en", "is"] as const, "Locale must be 'en' or 'is'.");

/**
 * Category slugs are generated, not inherited, so they can hold a strict
 * pattern that post slugs cannot.
 */
export const CategorySlugSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "A category needs a slug."),
	v.maxLength(60, "Keep the slug under 60 characters."),
	v.regex(/^[a-z0-9-]+$/u, "Lowercase letters, numbers and hyphens only."),
);

export const CategoryLabelSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "Give the category a label."),
	v.maxLength(60, "Keep the label under 60 characters."),
);

export const NoteIdSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "A note needs an id."),
	v.maxLength(120, "Keep the id under 120 characters."),
);

/**
 * A comment body. The rule lives here as a value and runs in two places only:
 * the textarea and the wire.
 */
export const CommentContentSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "Write something first."),
	v.maxLength(4000, "Keep it under 4000 characters."),
);

export const CommentFormSchema = v.object({ content: CommentContentSchema });
export type CommentForm = v.InferOutput<typeof CommentFormSchema>;

/** The whole form behind the "Add Category" dialog. */
export const CategoryFormSchema = v.object({
	slug: CategorySlugSchema,
	label: CategoryLabelSchema,
});
export type CategoryForm = v.InferOutput<typeof CategoryFormSchema>;

/**
 * The editor's metadata bar. `publishedAt` is a `yyyy-mm-dd` string because
 * that is what the date input round-trips; the contract takes a real Date, so
 * the boundary between them is one explicit conversion rather than a Date that
 * silently loses its time zone through a text field.
 */
export const PostMetaFormSchema = v.object({
	title: PostTitleSchema,
	publishedAt: v.pipe(
		v.string(),
		v.regex(/^\d{4}-\d{2}-\d{2}$/u, "Use yyyy-mm-dd."),
		v.check((value) => !Number.isNaN(Date.parse(value)), "That is not a real date."),
	),
	locale: LocaleSchema,
});
export type PostMetaForm = v.InferOutput<typeof PostMetaFormSchema>;
