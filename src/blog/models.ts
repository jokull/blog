/**
 * Wire shapes for posts, notes and categories.
 *
 * `PostModel` is the entity, keyed by `slug` — the same key the URL and the CLI
 * use. Every query that returns a post is indexed by that identity, so a
 * mutation returning the row patches the admin table and any other cached view
 * in place, with no page-level revalidation involved.
 *
 * `$satisfies` proves each shape is an exact projection of the stored row, so
 * adding a column to schema.ts without deciding whether it crosses the wire is
 * a type error rather than a silent omission.
 *
 * BROWSER-SAFE: the Drizzle imports are type-only and erased at build.
 */
import { defineModel, wire, type InputOf, type ModelValue } from "result-rpc";
import type { StoredCategory, StoredComment, StoredNote, StoredPost } from "@/schema";

const nullableString = wire.nullable(wire.string);
const nullableDate = wire.nullable(wire.date);

export const LocaleCodec = wire.union([wire.literal("is"), wire.literal("en")]);
export type Locale = InputOf<typeof LocaleCodec>;

export const PostModel = defineModel("post", {
	key: "slug",
	shape: {
		slug: wire.string,
		title: wire.string,
		markdown: wire.string,
		previewMarkdown: nullableString,
		publicAt: wire.nullable(wire.temporal.plainDate),
		createdAt: wire.date,
		publishedAt: wire.date,
		modifiedAt: nullableDate,
		revision: wire.number,
		locale: LocaleCodec,
		heroImage: nullableString,
		categorySlug: nullableString,
	},
}).$satisfies<StoredPost>();

/**
 * The admin table and `blog list`. A strict projection that leaves out
 * `markdown` and `previewMarkdown`: a row of dates and a publish switch has no
 * use for a post's full body. Still keyed by `slug`, so a mutation returning
 * the full row patches these rows too.
 */
export const PostRow = PostModel.pick(
	"slug",
	"title",
	"locale",
	"revision",
	"publicAt",
	"createdAt",
	"publishedAt",
	"modifiedAt",
	"heroImage",
	"categorySlug",
);

export const PostFull = PostModel.all(
	"`blog edit` round-trips the body and `blog backup` writes it to a file",
);

export type SavedPost = ModelValue<typeof PostModel>;
export type PostRowValue = InputOf<typeof PostRow>;

export const CategoryModel = defineModel("category", {
	key: "slug",
	shape: {
		slug: wire.string,
		label: wire.string,
		createdAt: wire.date,
	},
}).$satisfies<StoredCategory>();

export const CategoryView = CategoryModel.all("a category is a slug, a label and a date");
export type SavedCategory = ModelValue<typeof CategoryModel>;

/**
 * A stored comment plus its server-rendered body. `contentHtml` is not a
 * column — `rpc-server.ts` renders it from `content` on the way out — but it
 * belongs in the model rather than in a `.select()` extra, because
 * `cache.updateEntity` patches the model's fields and an edit has to be able to
 * invalidate the rendered copy alongside the markdown it was rendered from.
 */
type RenderedComment = StoredComment & { contentHtml: string | null };

/**
 * Keyed by `id`, so editing a comment patches it wherever it is cached and
 * hiding one dims it in place, with no page-level re-render.
 */
export const CommentModel = defineModel("comment", {
	key: "id",
	shape: {
		id: wire.number,
		postSlug: wire.string,
		authorGithubId: wire.number,
		authorGithubUsername: wire.string,
		authorAvatarUrl: wire.string,
		/** The markdown as written. Still the source of truth, and what `edit` loads. */
		content: wire.string,
		/**
		 * `content` rendered to HTML by `comment-markdown.ts`. `null` only on an
		 * optimistic row the client invented, which has never been near the
		 * renderer — `CommentBody` shows those as plain text until the server
		 * answers. Rendering them in the browser is exactly what this field
		 * exists to avoid.
		 */
		contentHtml: nullableString,
		isHidden: wire.boolean,
		createdAt: wire.date,
	},
}).$satisfies<RenderedComment>();

export const CommentView = CommentModel.all(
	"a comment is public by definition; the only private bit is whether it is hidden, which the reader can see anyway",
);

export type SavedComment = ModelValue<typeof CommentModel>;

export const NoteModel = defineModel("note", {
	key: "id",
	shape: {
		id: wire.string,
		description: nullableString,
		publishedAt: nullableDate,
		createdAt: wire.date,
	},
}).$satisfies<StoredNote>();

export const NoteView = NoteModel.all("a note is four columns and `blog note list` prints them");
export type SavedNote = ModelValue<typeof NoteModel>;

export const LinkVerdictCodec = wire.union([
	wire.object({ kind: wire.literal("status"), code: wire.number }),
	wire.object({ kind: wire.literal("unreachable") }),
]);
export type LinkVerdictValue = InputOf<typeof LinkVerdictCodec>;

/**
 * Not a model. A broken link has no identity in this database — it is the
 * output of a scan, recomputed from scratch every run — so it is a plain wire
 * shape, immune to entity patching by construction.
 */
export const BrokenLinkCodec = wire.object({
	postSlug: wire.string,
	postTitle: wire.string,
	url: wire.string,
	type: wire.union([wire.literal("link"), wire.literal("image")]),
	status: LinkVerdictCodec,
});
export type BrokenLinkValue = InputOf<typeof BrokenLinkCodec>;

const ChartPointCodec = wire.object({
	date: wire.string,
	Visitors: wire.number,
	Visits: wire.number,
	Pageviews: wire.number,
});
export type ChartPoint = InputOf<typeof ChartPointCodec>;

/**
 * The three OneDollarStats calls the dashboard makes, in one shape. They are
 * fetched together, fail together, and are rendered together; three procedures
 * would mean three independent failure states for one panel.
 */
export const StatsOverviewCodec = wire.object({
	daily: wire.array(ChartPointCodec),
	weekly: wire.array(ChartPointCodec),
	pageviewsBySlug: wire.record(wire.number),
});
export type StatsOverview = InputOf<typeof StatsOverviewCodec>;
