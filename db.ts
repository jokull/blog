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
 * Wire-level conversion, all in one place (generated db types: Date, boolean,
 * Temporal.PlainDate — the TursopgDB shapes):
 *   - TIMESTAMP (1114) → Date (UTC instant). tursopg emits "YYYY-MM-DD HH:MM:SS"
 *     wall-clock UTC; re-attach Z, parse.
 *   - BOOLEAN (16) → native boolean; pg parses t/f itself (no override).
 *   - INT8 (20) → number (COUNT(*) and bigserial columns).
 *   - DATE (1082) needs no override: plainDatePlugin's Date arm rebuilds
 *     Temporal.PlainDate from the driver's JS Date (UTC midnight).
 *
 * Writes pass Date / boolean values directly — the boundary is the types;
 * no epoch conversion anywhere.
 */

// The parser overrides are global, so they live at module scope — once.
// TIMESTAMP (1114): tursopg emits "YYYY-MM-DD HH:MM:SS" wall-clock UTC;
// re-attach Z and parse as UTC so the Date is TZ-deterministic in node and
// workerd alike. BOOLEAN (16) needs no override — pg parses native
// booleans. INT8 (20) → number (COUNT(*) and bigserial columns).
pg.types.setTypeParser(1114, (value) => new Date(`${value.replace(" ", "T")}Z`));
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
	createdAt: row.created_at,
	publishedAt: row.published_at,
	modifiedAt: row.modified_at,
	revision: row.revision,
	locale: row.locale,
	heroImage: row.hero_image,
	categorySlug: row.category_slug,
});

export const decodeCategory = (row: CategoryTable): StoredCategory => ({
	slug: row.slug,
	label: row.label,
	createdAt: row.created_at,
});

export const decodeComment = (row: Selectable<CommentTable>): StoredComment => ({
	id: row.id,
	postSlug: row.post_slug,
	authorGithubId: row.author_github_id,
	authorGithubUsername: row.author_github_username,
	authorAvatarUrl: row.author_avatar_url,
	content: row.content,
	isHidden: row.is_hidden,
	createdAt: row.created_at,
});

export const decodeNote = (row: NoteTable): StoredNote => ({
	id: row.id,
	description: row.description,
	publishedAt: row.published_at,
	createdAt: row.created_at,
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
	isPublished: row.is_published,
	forkedFromId: row.forked_from_id,
	blurb: row.blurb,
	colors: decodeColors(row),
	createdAt: row.created_at,
	modifiedAt: row.modified_at,
});
