import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNotNull, lt } from "drizzle-orm";
import type { Context, Next } from "hono";
import { Hono } from "hono";
import { z } from "zod/v4";
import { getSession, whoami } from "@/auth";
import { db } from "@/db";
import { env } from "@/env";
import { Note, Post } from "@/schema";

const app = new Hono().basePath("/api");

// Verify GitHub access token by calling GitHub API
async function verifyGitHubToken(token: string): Promise<string | null> {
	try {
		const user = await whoami(token);
		return user.login;
	} catch {
		return null;
	}
}

// Auth middleware - checks for admin access via session or GitHub token
async function authMiddleware(c: Context, next: Next) {
	// First, check for Authorization header (GitHub access token)
	const authHeader = c.req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);
		const username = await verifyGitHubToken(token);
		if (username === "jokull") {
			await next();
			return;
		}
		return c.json({ error: "Unauthorized" }, 401);
	}

	// Fall back to cookie-based session
	const session = await getSession();
	if (!session.githubUsername || session.githubUsername !== "jokull") {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
}

// Schemas
const CreatePostSchema = z.object({
	slug: z.string(),
	title: z.string(),
	markdown: z.string(),
	locale: z.enum(["en", "is"]).default("en"),
	categorySlug: z.string().nullable().optional(),
	heroImage: z.string().nullable().optional(),
});

const UpdatePostSchema = z.object({
	title: z.string().optional(),
	markdown: z.string().optional(),
	locale: z.enum(["en", "is"]).optional(),
	categorySlug: z.string().nullable().optional(),
	heroImage: z.string().nullable().optional(),
	publish: z.boolean().optional(),
});

const CreateNoteSchema = z.object({
	id: z.string(),
	url: z.string(),
	title: z.string(),
	description: z.string().optional(),
	sourceUrl: z.string().optional(),
	sourceAuthor: z.string().optional(),
	publish: z.boolean().optional(),
});

const UpdateNoteSchema = z.object({
	url: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	sourceUrl: z.string().optional(),
	sourceAuthor: z.string().optional(),
	publish: z.boolean().optional(),
});

// Routes - must be chained for RPC type inference
const route = app
	// Public endpoint for CLI to get OAuth client ID
	.get("/oauth-config", (c) => c.json({ clientId: env.GITHUB_CLIENT_ID }))
	.get("/posts", authMiddleware, async (c) => {
		const posts = await db.query.Post.findMany({
			orderBy: [desc(Post.publishedAt)],
		});
		return c.json({ posts });
	})
	.get("/posts/:slug", authMiddleware, async (c) => {
		const slug = c.req.param("slug")!;
		const post = await db.query.Post.findFirst({
			where: eq(Post.slug, slug),
		});
		if (!post) return c.json({ error: "Not found" }, 404);
		return c.json({ post });
	})
	.post("/posts", authMiddleware, zValidator("json", CreatePostSchema), async (c) => {
		const data = c.req.valid("json");
		await db.insert(Post).values({
			slug: data.slug,
			title: data.title,
			markdown: data.markdown,
			locale: data.locale,
			categorySlug: data.categorySlug ?? null,
			heroImage: data.heroImage ?? null,
			publishedAt: new Date(),
		});
		return c.json({ success: true, slug: data.slug });
	})
	.patch("/posts/:slug", authMiddleware, zValidator("json", UpdatePostSchema), async (c) => {
		const slug = c.req.param("slug");
		const data = c.req.valid("json");

		const updateData: Record<string, unknown> = { modifiedAt: new Date() };
		if (data.title !== undefined) updateData.title = data.title;
		if (data.markdown !== undefined) updateData.markdown = data.markdown;
		if (data.locale !== undefined) updateData.locale = data.locale;
		if (data.categorySlug !== undefined) updateData.categorySlug = data.categorySlug;
		if (data.heroImage !== undefined) updateData.heroImage = data.heroImage;
		if (data.publish === true) updateData.publicAt = new Date();
		if (data.publish === false) updateData.publicAt = null;

		await db.update(Post).set(updateData).where(eq(Post.slug, slug));
		return c.json({ success: true });
	})
	.delete("/posts/:slug", authMiddleware, async (c) => {
		const slug = c.req.param("slug")!;
		await db.delete(Post).where(eq(Post.slug, slug));
		return c.json({ success: true });
	})
	.get("/notes", async (c) => {
		const cursor = c.req.query("cursor");
		const limit = 20;
		const where = cursor
			? and(isNotNull(Note.publishedAt), lt(Note.publishedAt, new Date(Number(cursor))))
			: isNotNull(Note.publishedAt);
		const notes = await db.query.Note.findMany({
			where,
			orderBy: [desc(Note.publishedAt)],
			limit: limit + 1,
		});
		const hasMore = notes.length > limit;
		const items = hasMore ? notes.slice(0, limit) : notes;
		const nextCursor = hasMore ? items[items.length - 1]?.publishedAt?.getTime() : null;
		return c.json({ notes: items, nextCursor });
	})
	.get("/notes/all", authMiddleware, async (c) => {
		const notes = await db.query.Note.findMany({
			orderBy: [desc(Note.createdAt)],
		});
		return c.json({ notes });
	})
	.get("/notes/:id", authMiddleware, async (c) => {
		const id = c.req.param("id")!;
		const note = await db.query.Note.findFirst({
			where: eq(Note.id, id),
		});
		if (!note) return c.json({ error: "Not found" }, 404);
		return c.json({ note });
	})
	.post("/notes", authMiddleware, zValidator("json", CreateNoteSchema), async (c) => {
		const data = c.req.valid("json");
		await db.insert(Note).values({
			id: data.id,
			url: data.url,
			title: data.title,
			description: data.description ?? null,
			sourceUrl: data.sourceUrl ?? null,
			sourceAuthor: data.sourceAuthor ?? null,
			publishedAt: data.publish ? new Date() : null,
		});
		return c.json({ success: true, id: data.id });
	})
	.patch("/notes/:id", authMiddleware, zValidator("json", UpdateNoteSchema), async (c) => {
		const id = c.req.param("id");
		const data = c.req.valid("json");
		const updateData: Record<string, unknown> = {};
		if (data.url !== undefined) updateData.url = data.url;
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
		if (data.sourceAuthor !== undefined) updateData.sourceAuthor = data.sourceAuthor;
		if (data.publish === true) updateData.publishedAt = new Date();
		if (data.publish === false) updateData.publishedAt = null;
		await db.update(Note).set(updateData).where(eq(Note.id, id));
		return c.json({ success: true });
	})
	.delete("/notes/:id", authMiddleware, async (c) => {
		const id = c.req.param("id")!;
		await db.delete(Note).where(eq(Note.id, id));
		return c.json({ success: true });
	})
	.get("/categories", authMiddleware, async (c) => {
		const categories = await db.query.Category.findMany();
		return c.json({ categories });
	});

export type AppType = typeof route;
export { app };
