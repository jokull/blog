/**
 * The database as Kysely sees it: table types keyed by column name, plus the
 * decoded row types the blog models must match.
 *
 * Storage formats (fixed by the existing schema, written by the old drizzle
 * layer and now read raw by kysely):
 *
 * - Every timestamp column stores **epoch seconds** as an integer — never a
 *   Date and never milliseconds. Reads decode with `new Date(v * 1000)`; a
 *   write converts with the `epoch`/`epochOrNull` helpers in `db.ts`.
 * - Booleans store `0`/`1` integers.
 * - `kitty_theme.colors` stores JSON text.
 *
 * Column-level notes: `Generated` = the column is provided by the database or
 * its DDL default (`id` autoincrement).
 */
import type { Generated } from "kysely";
import type { ThemeColors } from "@/src/kitty/colors";

export type DB = {
	category: CategoryTable;
	comment: CommentTable;
	kitty_theme: KittyThemeTable;
	note: NoteTable;
	post: PostTable;
};

export type CategoryTable = {
	slug: string;
	label: string;
	created_at: number;
};

export type CommentTable = {
	id: Generated<number>;
	post_slug: string;
	author_github_id: number;
	author_github_username: string;
	author_avatar_url: string;
	content: string;
	is_hidden: 0 | 1;
	created_at: number;
};

export type KittyThemeTable = {
	id: Generated<number>;
	slug: string;
	name: string;
	author_github_id: number;
	author_github_username: string;
	author_avatar_url: string;
	is_published: 0 | 1;
	forked_from_id: number | null;
	blurb: string | null;
	/** The theme colors as JSON text. Decode with `JSON.parse`. */
	colors: string;
	created_at: number;
	modified_at: number | null;
};

export type NoteTable = {
	id: string;
	description: string | null;
	published_at: number | null;
	created_at: number;
};

export type PostTable = {
	slug: string;
	title: string;
	markdown: string;
	preview_markdown: string | null;
	public_at: number | null;
	created_at: number;
	published_at: number;
	modified_at: number | null;
	revision: number;
	locale: "is" | "en";
	hero_image: string | null;
	category_slug: string | null;
};

/**
 * `category` with timestamps decoded and columns renamed to the camelCase the
 * blog models use. The model drift boundary: `CategoryModel` satisfies this,
 * and the `decodeCategory` in `db.ts` is the one bridge from the raw row.
 */
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
	publicAt: Date | null;
	createdAt: Date;
	publishedAt: Date;
	modifiedAt: Date | null;
	revision: number;
	locale: "is" | "en";
	heroImage: string | null;
	categorySlug: string | null;
};
