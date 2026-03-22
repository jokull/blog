import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const Category = sqliteTable("category", {
	slug: text("slug").notNull().primaryKey(),
	label: text("label").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$default(() => new Date()),
});

export const Post = sqliteTable("post", {
	slug: text("slug").notNull().primaryKey(),
	title: text("title").notNull(),
	markdown: text("markdown").notNull(),
	previewMarkdown: text("preview_markdown"),
	publicAt: integer("public_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$default(() => new Date()),
	publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
	modifiedAt: integer("modified_at", { mode: "timestamp" }),
	locale: text("locale", { enum: ["is", "en"] })
		.default("en")
		.notNull(),
	heroImage: text("hero_image"),
	categorySlug: text("category_slug").references(() => Category.slug),
});

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

interface OklchColor {
	l: number; // Lightness (0-1)
	c: number; // Chroma (0-0.37)
	h: number; // Hue (0-360)
}

export const Note = sqliteTable("note", {
	id: text("id").notNull().primaryKey(),
	url: text("url").notNull(),
	title: text("title").notNull(),
	description: text("description"),
	sourceUrl: text("source_url"),
	sourceAuthor: text("source_author"),
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
	colors: text("colors", { mode: "json" }).notNull().$type<{
		color0: OklchColor;
		color1: OklchColor;
		color2: OklchColor;
		color3: OklchColor;
		color4: OklchColor;
		color5: OklchColor;
		color6: OklchColor;
		color7: OklchColor;
		color8: OklchColor;
		color9: OklchColor;
		color10: OklchColor;
		color11: OklchColor;
		color12: OklchColor;
		color13: OklchColor;
		color14: OklchColor;
		color15: OklchColor;
		foreground: OklchColor;
		background: OklchColor;
		cursor: OklchColor;
		selection_foreground: OklchColor;
		selection_background: OklchColor;
	}>(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$default(() => new Date()),
	modifiedAt: integer("modified_at", { mode: "timestamp" }),
});
