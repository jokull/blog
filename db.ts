import { env } from "cloudflare:workers";
import { plainDatePlugin } from "./lib/plain-date-plugin";
import { Kysely, type Selectable } from "kysely";
import { D1Dialect } from "kysely-d1";
import { Temporal } from "temporal-polyfill";
import { kyselyTryDb } from "db-result/kysely";
import type { SqliteDbError } from "db-result/sqlite";
import { ThemeColorsCodec, type ThemeColors } from "@/src/kitty/colors";
import type {
	CategoryTable,
	CommentTable,
	DB,
	KittyThemeTable,
	NoteTable,
	PostTable,
	StoredCategory,
	StoredComment,
	StoredKittyTheme,
	StoredNote,
	StoredPost,
} from "./schema";

/**
 * Wrapped with db-result's `kyselyTryDb`: every builder terminal resolves
 * `Result<T, E>` with the sqlite protocol union — classified db failures,
 * transient retries, and `executeTakeFirst`'s absent-row `undefined` (or the
 * `NoResultError` lane of `executeTakeFirstOrThrow`). No `tryDb` litter at
 * call sites; handlers fold the db/* tags they know and throw the rest.
 */
export const rawDb = new Kysely<DB>({ dialect: new D1Dialect({ database: env.DB }) }).withPlugin(
	plainDatePlugin(["public_at"]),
);

export const db = kyselyTryDb<typeof rawDb, SqliteDbError>(rawDb);

/**
 * Epoch seconds is the storage unit of every timestamp column (the schema's
 * legacy format, written by the old drizzle layer). These two helpers are the
 * only sanctioned way to convert for a write.
 */
export const epoch = (date: Date): number => Math.floor(date.getTime() / 1000);
export const epochOrNull = (date: Date | null): number | null =>
	date === null ? null : Math.floor(date.getTime() / 1000);

/**
 * The raw row decoded to the model's exact shape — the drift boundary.
 * Written out field by field rather than spread, so a new column in schema.ts
 * is a decision here instead of an accident on the wire.
 */
export const decodePost = (row: PostTable): StoredPost => ({
	slug: row.slug,
	title: row.title,
	markdown: row.markdown,
	previewMarkdown: row.preview_markdown,
	publicAt: row.public_at === null ? null : toPlainDate(row.public_at),
	createdAt: new Date(row.created_at * 1000),
	publishedAt: new Date(row.published_at * 1000),
	modifiedAt: row.modified_at === null ? null : new Date(row.modified_at * 1000),
	revision: row.revision,
	locale: row.locale,
	heroImage: row.hero_image,
	categorySlug: row.category_slug,
});

/**
 * The plugin has already marshaled the column to `Temporal.PlainDate`, but
 * the type layer only sees `string` (storage-faithful types, decoders at the
 * edge — see the header comment). Accept both and validate strings through
 * `Temporal.PlainDate.from`, so a malformed date is a Panic, not a cast.
 */
const toPlainDate = (value: string | Temporal.PlainDate): Temporal.PlainDate =>
	value instanceof Temporal.PlainDate ? value : Temporal.PlainDate.from(value);

export const decodeCategory = (row: CategoryTable): StoredCategory => ({
	slug: row.slug,
	label: row.label,
	createdAt: new Date(row.created_at * 1000),
});

export const decodeComment = (row: Selectable<CommentTable>): StoredComment => ({
	id: row.id,
	postSlug: row.post_slug,
	authorGithubId: row.author_github_id,
	authorGithubUsername: row.author_github_username,
	authorAvatarUrl: row.author_avatar_url,
	content: row.content,
	isHidden: row.is_hidden === 1,
	createdAt: new Date(row.created_at * 1000),
});

export const decodeNote = (row: NoteTable): StoredNote => ({
	id: row.id,
	description: row.description,
	publishedAt: row.published_at === null ? null : new Date(row.published_at * 1000),
	createdAt: new Date(row.created_at * 1000),
});

/**
 * Stored colors are JSON text. Decode validates rather than casts, so a
 * corrupted row becomes a Panic (scenario C) instead of a mis-shapen theme.
 */
const decodeColors = (row: Selectable<KittyThemeTable>): ThemeColors => {
	const decoded = ThemeColorsCodec.decode(JSON.parse(row.colors));
	if (!decoded.ok)
		throw new Error(`stored theme colors failed validation: ${JSON.stringify(decoded.issues)}`);
	return decoded.value;
};

export const decodeTheme = (row: Selectable<KittyThemeTable>): StoredKittyTheme => ({
	id: row.id,
	slug: row.slug,
	name: row.name,
	authorGithubId: row.author_github_id,
	authorGithubUsername: row.author_github_username,
	authorAvatarUrl: row.author_avatar_url,
	isPublished: row.is_published === 1,
	forkedFromId: row.forked_from_id,
	blurb: row.blurb,
	colors: decodeColors(row),
	createdAt: new Date(row.created_at * 1000),
	modifiedAt: row.modified_at === null ? null : new Date(row.modified_at * 1000),
});
