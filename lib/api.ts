import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { Hono } from "hono";
import { z } from "zod/v4";
import { getSession, whoami } from "@/auth";
import { createCliToken, verifyCliToken } from "@/lib/cli-token";
import { db } from "@/db";
import { env } from "@/env";
import { Note, Post } from "@/schema";

const app = new Hono().basePath("/api");

// Auth middleware - checks for admin access via app token, GitHub token, or session
async function authMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);

		// Try app token first (contains a dot separator)
		if (token.includes(".")) {
			const username = await verifyCliToken(token);
			if (username === "jokull") {
				await next();
				return;
			}
		}

		// Fall back to GitHub token
		try {
			const user = await whoami(token);
			if (user.login === "jokull") {
				await next();
				return;
			}
		} catch {
			// Not a valid GitHub token either
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
	description: z.string().optional(),
	publish: z.boolean().optional(),
});

const UpdateNoteSchema = z.object({
	description: z.string().optional(),
	publish: z.boolean().optional(),
});

// Routes - must be chained for RPC type inference
const route = app
	// Public endpoint for CLI to get OAuth client ID
	.get("/oauth-config", (c) => c.json({ clientId: env.GITHUB_CLIENT_ID }))
	.post("/cli-token", async (c) => {
		const authHeader = c.req.header("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return c.json({ error: "Missing Authorization header" }, 401);
		}
		const githubToken = authHeader.slice(7);
		try {
			const user = await whoami(githubToken);
			if (user.login !== "jokull") {
				return c.json({ error: "Unauthorized" }, 403);
			}
			const token = await createCliToken(user.login);
			return c.json({ token });
		} catch {
			return c.json({ error: "Invalid GitHub token" }, 401);
		}
	})
	.get("/posts", authMiddleware, async (c) => {
		const posts = await db.query.Post.findMany({
			orderBy: { publishedAt: "desc" },
		});
		return c.json({ posts });
	})
	.get("/posts/:slug", authMiddleware, async (c) => {
		const slug = c.req.param("slug")!;
		const post = await db.query.Post.findFirst({
			where: { slug },
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
		const notes = await db.query.Note.findMany({
			where: {
				publishedAt: cursor
					? { isNotNull: true, lt: new Date(Number(cursor)) }
					: { isNotNull: true },
			},
			orderBy: { publishedAt: "desc" },
			limit: limit + 1,
		});
		const hasMore = notes.length > limit;
		const items = hasMore ? notes.slice(0, limit) : notes;
		const nextCursor = hasMore ? items[items.length - 1]?.publishedAt?.getTime() : null;
		return c.json({ notes: items, nextCursor });
	})
	.get("/notes/all", authMiddleware, async (c) => {
		const notes = await db.query.Note.findMany({
			orderBy: { createdAt: "desc" },
		});
		return c.json({ notes });
	})
	.get("/notes/:id", authMiddleware, async (c) => {
		const id = c.req.param("id")!;
		const note = await db.query.Note.findFirst({
			where: { id },
		});
		if (!note) return c.json({ error: "Not found" }, 404);
		return c.json({ note });
	})
	.post("/notes", authMiddleware, zValidator("json", CreateNoteSchema), async (c) => {
		const data = c.req.valid("json");
		await db.insert(Note).values({
			id: data.id,
			description: data.description ?? null,
			publishedAt: data.publish ? new Date() : null,
		});
		return c.json({ success: true, id: data.id });
	})
	.patch("/notes/:id", authMiddleware, zValidator("json", UpdateNoteSchema), async (c) => {
		const id = c.req.param("id");
		const data = c.req.valid("json");
		const updateData: Record<string, unknown> = {};
		if (data.description !== undefined) updateData.description = data.description;
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
