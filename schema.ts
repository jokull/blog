/**
 * The database. Drizzle table definitions are the source of truth — they feed
 * drizzle-kit's migration generation — and the kysely types the queries see
 * are derived from them by the vendored `Kyselify` port in `src/db/kyselify.ts`.
 *
 * Storage formats (fixed by the existing schema, written by the old drizzle
 * layer and now read raw by kysely):
 *
 * - Every timestamp column stores **epoch seconds** as an integer — never a
 *   Date and never milliseconds. Reads decode with `new Date(v * 1000)`; a
 *   write converts with the `epoch`/`epochOrNull` helpers in `db.ts`.
 * - `post.public_at` is the one exception: a calendar date stored as
 *   `YYYY-MM-DD` TEXT (GLOB CHECK'd), marshaled to `Temporal.PlainDate` by
 *   the calendar plugin at the query boundary.
 * - Booleans store `0`/`1` integers.
 * - `kitty_theme.colors` stores JSON text.
 *
 * `Stored*` types are the decoded rows the blog models must match, and
 * `decode*` in `db.ts` is the one bridge from the raw kysely row.
 */
import { defineRelations, sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
// Type-only: the same declaration the wire codec uses, so the column and the
// RPC contract cannot drift. Erased at build.
import type { ThemeColors } from "@/src/kitty/colors";
import type { Temporal } from "temporal-polyfill";

export const Category = sqliteTable("category", {
	slug: text("slug").notNull().primaryKey(),
	label: text("label").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$default(() => new Date()),
});

export const Post = sqliteTable(
	"post",
	{
		slug: text("slug").notNull().primaryKey(),
		title: text("title").notNull(),
		markdown: text("markdown").notNull(),
		previewMarkdown: text("preview_markdown"),
		publicAt: text("public_at"),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$default(() => new Date()),
		publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
		modifiedAt: integer("modified_at", { mode: "timestamp" }),
		revision: integer("revision").default(1).notNull(),
		locale: text("locale", { enum: ["is", "en"] })
			.default("en")
			.notNull(),
		heroImage: text("hero_image"),
		categorySlug: text("category_slug").references(() => Category.slug),
	},
	(table) => [
		// public_at is a calendar date, not a timestamp: YYYY-MM-DD TEXT with a
		// format CHECK (SQLite has no date type and D1 registers no REGEXP, so
		// the constraint is GLOB character classes; semantic validity is
		// Temporal.PlainDate.from's job when the row is read). The calendar
		// plugin marshals it to Temporal.PlainDate at the query boundary.
		check(
			"public_at_iso",
			sql`${table.publicAt} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
		),
	],
);

export const Comment = sqliteTable("comment", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	postSlug: text("post_slug")
		.notNull()
		.references(() => Post.slug),
	authorGithubId: integer("author_github_id", { mode: "number" }).notNull(),
	authorGithubUsername: text("author_github_username").notNull(),
	authorAvatarUrl: text("author_avatar_url").notNull(),
	content: text("content").notNull(),
	isHidden: integer("is_hidden", { mode: "boolean" }).default(false).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$default(() => new Date()),
});

export const Note = sqliteTable("note", {
	id: text("id").notNull().primaryKey(),
	description: text("description"),
	publishedAt: integer("published_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$default(() => new Date()),
});

export const KittyTheme = sqliteTable("kitty_theme", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	authorGithubId: integer("author_github_id", { mode: "number" }).notNull(),
	authorGithubUsername: text("author_github_username").notNull(),
	authorAvatarUrl: text("author_avatar_url").notNull(),
	isPublished: integer("is_published", { mode: "boolean" }).default(false).notNull(),
	// Self-reference: `any` required to break circular type inference in Drizzle ORM
	forkedFromId: integer("forked_from_id", { mode: "number" }).references(
		(): any => KittyTheme.id,
	),
	blurb: text("blurb"),
	colors: text("colors", { mode: "json" }).notNull().$type<ThemeColors>(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$default(() => new Date()),
	modifiedAt: integer("modified_at", { mode: "timestamp" }),
});

export const relations = defineRelations({ Category, Comment, KittyTheme, Note, Post }, (r) => ({
	Category: {
		posts: r.many.Post({ from: r.Category.slug, to: r.Post.categorySlug }),
	},
	Post: {
		category: r.one.Category({ from: r.Post.categorySlug, to: r.Category.slug }),
		comments: r.many.Comment(),
	},
	Comment: {
		post: r.one.Post({ from: r.Comment.postSlug, to: r.Post.slug, optional: false }),
	},
	KittyTheme: {
		forkedFrom: r.one.KittyTheme({
			from: r.KittyTheme.forkedFromId,
			to: r.KittyTheme.id,
			alias: "forkedFrom",
		}),
		forks: r.many.KittyTheme({
			from: r.KittyTheme.id,
			to: r.KittyTheme.forkedFromId,
			alias: "forkedFrom",
		}),
	},
}));

// The kysely table types, generated from the drizzle definitions above by
// scripts/gen-db-types.ts (`bun run gen:db-types`). Storage-faithful: epoch
// seconds, 0/1 booleans, JSON text.
export type {
	DB,
	CategoryTable,
	CommentTable,
	KittyThemeTable,
	NoteTable,
	PostTable,
} from "@/src/db/db-types.generated";

export type StoredCategory = {
	slug: string;
	label: string;
	createdAt: Date;
};

export type StoredComment = {
	id: number;
	postSlug: string;
	authorGithubId: number;
	authorGithubUsername: string;
	authorAvatarUrl: string;
	content: string;
	isHidden: boolean;
	createdAt: Date;
};

export type StoredKittyTheme = {
	id: number;
	slug: string;
	name: string;
	authorGithubId: number;
	authorGithubUsername: string;
	authorAvatarUrl: string;
	isPublished: boolean;
	forkedFromId: number | null;
	blurb: string | null;
	colors: ThemeColors;
	createdAt: Date;
	modifiedAt: Date | null;
};

export type StoredNote = {
	id: string;
	description: string | null;
	publishedAt: Date | null;
	createdAt: Date;
};

export type StoredPost = {
	slug: string;
	title: string;
	markdown: string;
	previewMarkdown: string | null;
	/** A calendar date, marshaled to Temporal.PlainDate by the plugin. */
	publicAt: Temporal.PlainDate | null;
	createdAt: Date;
	publishedAt: Date;
	modifiedAt: Date | null;
	revision: number;
	locale: "is" | "en";
	heroImage: string | null;
	categorySlug: string | null;
};
