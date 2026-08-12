import { env } from "cloudflare:workers";
import { plainDatePlugin } from "./lib/plain-date-plugin";
import { Kysely, PostgresDialect, type Selectable } from "kysely";
import pg from "pg";
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
 * The per-request database factory: this is the tursopg cutover — the blog's
 * data layer now talks to Turso's Postgres frontend over the PG wire protocol
 * instead of D1.
 *
 * One Kysely instance per request, because workerd cannot reuse a TCP
 * connection across request handlers: a module-scope pool hands the next
 * request a socket from the previous request's context and hangs (spiked
 * 2026-08-12 — postgres.js errors cleanly, pg hangs). `createDb()` per
 * request, disposed when the request is done.
 *
 * Wire-level conversion keeps the app's storage-faithful boundary (generated
 * db types: epoch seconds, 0/1) while the columns are TIMESTAMP/BOOLEAN/DATE:
 *   - TIMESTAMP (1114) → epoch seconds. tursopg emits "YYYY-MM-DD HH:MM:SS"
 *     wall-clock UTC; re-attach Z, parse, floor.
 *   - BOOLEAN (16) → 0 | 1. tursopg sends t/f.
 *   - INT8 (20) → number (COUNT(*) and bigserial columns).
 *   - DATE (1082) needs no override: plainDatePlugin's Date arm rebuilds
 *     Temporal.PlainDate from the driver's JS Date (UTC midnight).
 *
 * The Date/boolean boundary flip (generated types + decodes + schema) is the
 * pending increment; this keeps the cutover runnable end to end first.
 */

// The parser overrides are global, so they live at module scope — once.
pg.types.setTypeParser(1114, (value) =>
	Math.floor(Date.parse(`${value.replace(" ", "T")}Z`) / 1000),
);
pg.types.setTypeParser(16, (value) => (value === "t" ? 1 : 0));
pg.types.setTypeParser(20, (value) => parseInt(value, 10));

export type Db = ReturnType<typeof createDb>["db"];

export const createDb = () => {
	const pool = new pg.Pool({ connectionString: env.TURSO_PG_URL, max: 1 });
	// FK enforcement is OFF by default on tursopg (D1 has it on). One SET per
	// connection, like real PG — pool.on("connect") fires per new client.
	// Until turso PR #8191 lands, the server shares one connection, so this is
	// idempotent.
	pool.on("connect", (client) => {
		void client.query("SET foreign_keys = ON");
	});
	const rawDb = new Kysely<DB>({
		dialect: new PostgresDialect({ pool }),
	}).withPlugin(plainDatePlugin(["public_at"]));
	const db = kyselyTryDb<typeof rawDb, SqliteDbError>(rawDb);
	return { rawDb, db, destroy: () => pool.end() };
};

/** One request's worth of work against a fresh per-request database. */
export const withDb = async <T>(
	fn: (db: ReturnType<typeof createDb>["db"]) => Promise<T>,
): Promise<T> => {
	const handle = createDb();
	try {
		return await fn(handle.db);
	} finally {
		await handle.destroy();
	}
};

/**
 * Epoch seconds is the storage unit of every timestamp column at the app
 * boundary (the parser override above converts TIMESTAMP to it). These two
 * helpers are the only sanctioned way to convert for a write.
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
	// The plugin already hydrated this (and panics on a CHECK-legal but
	// invalid date); the type enforces it — a plugin-less query path would
	// be a compile-time error here, not a silent string.
	publicAt: row.public_at,
	createdAt: new Date(row.created_at * 1000),
	publishedAt: new Date(row.published_at * 1000),
	modifiedAt: row.modified_at === null ? null : new Date(row.modified_at * 1000),
	revision: row.revision,
	locale: row.locale,
	heroImage: row.hero_image,
	categorySlug: row.category_slug,
});

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
