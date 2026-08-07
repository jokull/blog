/**
 * SERVER-ONLY: the blog handlers.
 *
 * Both front ends — the dashboard and the CLI — call the procedures below, so
 * there is exactly one implementation of each post operation.
 *
 * Nothing in the browser graph may reach this file: it closes over the D1
 * binding, the iron-session password and the GitHub client secret.
 */
import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { err, ok } from "result-rpc";
import { tryDb, isConstraintViolation, isForeignKeyViolation } from "db-result";
import { orThrow, rawDb } from "@/db";
import { createCliToken } from "@/lib/cli-token";
import { checkPostLinks } from "@/lib/link-checker";
import { extractFirstImage } from "@/lib/mdx-image-extractor";
import { createStatsClient } from "@/lib/onedollarstats";
import { renderCommentHtml } from "./comment-markdown";
import { getGithubUser } from "@/auth";
import { requireAdmin, requireViewer, server, session } from "@/src/rpc/server-base";
import { Category, Comment, Note, Post } from "@/schema";
import {
	checkLinksContract,
	cliContract,
	createCommentContract,
	deleteCommentContract,
	listCommentsContract,
	setCommentHiddenContract,
	updateCommentContract,
	createCategoryContract,
	createNoteContract,
	createPostContract,
	deleteCategoryContract,
	deleteNoteContract,
	deletePostContract,
	exportPostsContract,
	listCategoriesContract,
	listNotesContract,
	listPostsContract,
	postBySlugContract,
	setPublishedContract,
	statsOverviewContract,
	updateNoteContract,
	updatePostContract,
} from "./contract";
import {
	CommentModel,
	NoteModel,
	PostModel,
	type SavedCategory,
	type SavedComment,
	type SavedNote,
	type SavedPost,
	type ChartPoint,
	type PostRowValue,
} from "./models";

/**
 * The Drizzle row mapped to each model's exact shape — the drift boundary.
 * Written out field by field rather than spread, so a new column in schema.ts
 * is a decision here instead of an accident on the wire.
 */
const toPost = (row: typeof Post.$inferSelect): SavedPost => ({
	slug: row.slug,
	title: row.title,
	markdown: row.markdown,
	previewMarkdown: row.previewMarkdown,
	publicAt: row.publicAt,
	createdAt: row.createdAt,
	publishedAt: row.publishedAt,
	modifiedAt: row.modifiedAt,
	revision: row.revision,
	locale: row.locale,
	heroImage: row.heroImage,
	categorySlug: row.categorySlug,
});

/**
 * The table projection. `PostRow` is a strict view — it validates an exact
 * shape rather than stripping a wider one — so the bodies have to be dropped
 * here, which is the point: `posts.list` cannot accidentally ship every post's
 * markdown.
 */
const toPostRow = (row: typeof Post.$inferSelect): PostRowValue => ({
	slug: row.slug,
	title: row.title,
	locale: row.locale,
	revision: row.revision,
	publicAt: row.publicAt,
	createdAt: row.createdAt,
	publishedAt: row.publishedAt,
	modifiedAt: row.modifiedAt,
	heroImage: row.heroImage,
	categorySlug: row.categorySlug,
});

const toCategory = (row: typeof Category.$inferSelect): SavedCategory => ({
	slug: row.slug,
	label: row.label,
	createdAt: row.createdAt,
});

/**
 * `contentHtml` is rendered here rather than stored, so a change to the
 * renderer or the token CSS takes effect on the next read instead of needing a
 * backfill over every comment ever written. It is cheap enough to mean it:
 * `@tanstack/highlight` is a synchronous tokenizer with no WASM and no async
 * init, which is why it is the highlighter on this path.
 */
const toComment = (row: typeof Comment.$inferSelect): SavedComment => ({
	id: row.id,
	postSlug: row.postSlug,
	authorGithubId: row.authorGithubId,
	authorGithubUsername: row.authorGithubUsername,
	authorAvatarUrl: row.authorAvatarUrl,
	content: row.content,
	contentHtml: renderCommentHtml(row.content),
	isHidden: row.isHidden,
	createdAt: row.createdAt,
});

const toNote = (row: typeof Note.$inferSelect): SavedNote => ({
	id: row.id,
	description: row.description,
	publishedAt: row.publishedAt,
	createdAt: row.createdAt,
});

// ---------------------------------------------------------------- posts

const listPosts = server
	.implement(listPostsContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const rows = orThrow(
			await context.db.query.Post.findMany({ orderBy: { publishedAt: "desc" } }),
		);
		return ok(rows.map(toPostRow));
	});

const exportPosts = server
	.implement(exportPostsContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const rows = orThrow(
			await context.db.query.Post.findMany({ orderBy: { publishedAt: "desc" } }),
		);
		return ok(rows.map(toPost));
	});

const postBySlug = server
	.implement(postBySlugContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const row = orThrow(await context.db.query.Post.findFirst({ where: { slug: input.slug } }));
		if (!row) return err(errors.notFound({ slug: input.slug }));
		return ok(toPost(row));
	});

const createPost = server
	.implement(createPostContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const now = new Date();
		/**
		 * The database already holds both rules — `slug` is the primary key and
		 * `category_slug` is a foreign key — so `tryDb` folds the constraint
		 * failures into declared errors instead of racing a pre-flight SELECT
		 * that could go stale between check and insert.
		 */
		const inserted = await tryDb(
			rawDb
				.insert(Post)
				.values({
					slug: input.slug,
					title: input.title,
					markdown: input.markdown,
					locale: input.locale,
					categorySlug: input.categorySlug,
					heroImage: input.heroImage ?? (await extractFirstImage(input.markdown)),
					publishedAt: now,
					createdAt: now,
					publicAt: input.publish ? now : null,
				})
				.returning(),
		);

		if (inserted.isErr()) {
			const cause = inserted.error;
			if (isForeignKeyViolation(cause)) {
				return err(errors.notFound({ slug: input.categorySlug ?? "" }));
			}
			if (isConstraintViolation(cause)) {
				return err(errors.slugTaken({ slug: input.slug }));
			}
			throw cause; // the defect channel: incidentId'd server/internal
		}

		return ok(toPost(inserted.value[0]));
	});

const updatePost = server
	.implement(updatePostContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const existing = orThrow(
			await context.db.query.Post.findFirst({ where: { slug: input.slug } }),
		);
		if (!existing) return err(errors.notFound({ slug: input.slug }));
		if (existing.revision !== input.expectedRevision) {
			return err(
				errors.staleRevision({
					slug: input.slug,
					expected: input.expectedRevision,
					current: existing.revision,
				}),
			);
		}

		if (input.categorySlug != null) {
			const category = orThrow(
				await context.db.query.Category.findFirst({
					where: { slug: input.categorySlug },
				}),
			);
			if (!category) return err(errors.unknownCategory({ slug: input.categorySlug }));
		}

		const patch: Partial<typeof Post.$inferInsert> = {};
		if (input.title !== undefined) patch.title = input.title;
		if (input.publishedAt !== undefined) patch.publishedAt = input.publishedAt;
		if (input.locale !== undefined) patch.locale = input.locale;
		if (input.categorySlug !== undefined) patch.categorySlug = input.categorySlug;
		if (input.heroImage !== undefined) patch.heroImage = input.heroImage;

		/**
		 * Writing the body supersedes any draft, so the preview column is cleared —
		 * otherwise the next publish would promote a stale draft over the body this
		 * write just landed. The hero image follows the new body unless the caller
		 * named one explicitly.
		 */
		if (input.markdown !== undefined) {
			patch.markdown = input.markdown;
			patch.previewMarkdown = null;
			if (input.heroImage === undefined) {
				patch.heroImage = await extractFirstImage(input.markdown);
			}
		}

		const rows = orThrow(
			await tryDb(
				rawDb
					.update(Post)
					.set({ ...patch, modifiedAt: new Date(), revision: sql`${Post.revision} + 1` })
					// The revision is re-checked in the WHERE clause, not just above, so a
					// writer that slipped in between the SELECT and here loses the race
					// rather than being overwritten by it.
					.where(
						and(eq(Post.slug, input.slug), eq(Post.revision, input.expectedRevision)),
					)
					.returning(),
			),
		);

		// Drizzle types `.returning()` as a non-empty tuple, so this has to be a
		// length check: an empty result means the revision guard in the WHERE
		// clause rejected the write, which is the whole point of it.
		if (rows.length === 0) {
			const current = orThrow(
				await context.db.query.Post.findFirst({ where: { slug: input.slug } }),
			);
			if (!current) return err(errors.notFound({ slug: input.slug }));
			return err(
				errors.staleRevision({
					slug: input.slug,
					expected: input.expectedRevision,
					current: current.revision,
				}),
			);
		}

		return ok(toPost(rows[0]));
	});

/**
 * THE publish path — the one the dashboard switch and `blog update --publish`
 * both reach.
 *
 * Publishing promotes the draft into the body, clears the draft and re-extracts
 * the hero image. Flipping `publicAt` alone would ship the previous body and
 * leave an orphaned `previewMarkdown` behind, so all four happen together.
 */
const setPublished = server
	.implement(setPublishedContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const existing = orThrow(
			await context.db.query.Post.findFirst({ where: { slug: input.slug } }),
		);
		if (!existing) return err(errors.notFound({ slug: input.slug }));

		// Absolute, not a toggle: asking for the state it is already in is a
		// no-op rather than a flip, so a double click cannot unpublish.
		if ((existing.publicAt !== null) === input.published) return ok(toPost(existing));

		const markdown = input.published
			? (existing.previewMarkdown ?? existing.markdown)
			: existing.markdown;
		const heroImage = markdown ? await extractFirstImage(markdown) : existing.heroImage;

		const rows = orThrow(
			await tryDb(
				rawDb
					.update(Post)
					.set({
						publicAt: input.published ? new Date() : null,
						markdown,
						previewMarkdown: null,
						heroImage,
						modifiedAt: new Date(),
						revision: sql`${Post.revision} + 1`,
					})
					.where(eq(Post.slug, input.slug))
					.returning(),
			),
		);

		return ok(toPost(rows[0]));
	});

const deletePost = server
	.implement(deletePostContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context, touch }) => {
		const existing = orThrow(
			await context.db.query.Post.findFirst({ where: { slug: input.slug } }),
		);
		if (!existing) return err(errors.notFound({ slug: input.slug }));

		orThrow(await context.db.delete(Post).where(eq(Post.slug, input.slug)));
		// A deleted row cannot ride back as an entity, so invalidate by identity.
		touch(PostModel, input.slug);
		return ok({ slug: input.slug });
	});

// ----------------------------------------------------------- categories

const listCategories = server
	.implement(listCategoriesContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const rows = orThrow(
			await context.db.query.Category.findMany({ orderBy: { label: "asc" } }),
		);
		return ok(rows.map(toCategory));
	});

const createCategory = server
	.implement(createCategoryContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		// The slug pattern is enforced by the contract's `wire.standard`, so the
		// only failure left is the one the database owns: the primary key.
		const inserted = await tryDb(
			rawDb.insert(Category).values({ slug: input.slug, label: input.label }).returning(),
		);

		if (inserted.isErr()) {
			const cause = inserted.error;
			if (isConstraintViolation(cause)) {
				return err(errors.slugTaken({ slug: input.slug }));
			}
			throw cause; // the defect channel: incidentId'd server/internal
		}

		return ok(toCategory(inserted.value[0]));
	});

const deleteCategory = server
	.implement(deleteCategoryContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const existing = orThrow(
			await context.db.query.Category.findFirst({ where: { slug: input.slug } }),
		);
		if (!existing) return err(errors.notFound({ slug: input.slug }));

		const counted = orThrow(
			await context.db
				.select({ count: sql<number>`count(*)` })
				.from(Post)
				.where(eq(Post.categorySlug, input.slug)),
		);

		const postCount = Number(counted[0]?.count ?? 0);
		if (postCount > 0) return err(errors.inUse({ slug: input.slug, postCount }));

		orThrow(await context.db.delete(Category).where(eq(Category.slug, input.slug)));
		return ok({ slug: input.slug });
	});

// ---------------------------------------------------------------- notes

const listNotes = server
	.implement(listNotesContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const rows = orThrow(
			await context.db.query.Note.findMany({ orderBy: { createdAt: "desc" } }),
		);
		return ok(rows.map(toNote));
	});

const createNote = server
	.implement(createNoteContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const inserted = await tryDb(
			rawDb
				.insert(Note)
				.values({
					id: input.id,
					description: input.description,
					publishedAt: input.publish ? new Date() : null,
				})
				.returning(),
		);

		if (inserted.isErr()) {
			const cause = inserted.error;
			if (isConstraintViolation(cause)) {
				return err(errors.idTaken({ id: input.id }));
			}
			throw cause; // the defect channel: incidentId'd server/internal
		}

		return ok(toNote(inserted.value[0]));
	});

const updateNote = server
	.implement(updateNoteContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const existing = orThrow(
			await context.db.query.Note.findFirst({ where: { id: input.id } }),
		);
		if (!existing) return err(errors.notFound({ id: input.id }));

		const patch: Partial<typeof Note.$inferInsert> = {};
		if (input.description !== undefined) patch.description = input.description;
		if (input.publish !== undefined) patch.publishedAt = input.publish ? new Date() : null;

		const rows = orThrow(
			await tryDb(rawDb.update(Note).set(patch).where(eq(Note.id, input.id)).returning()),
		);

		return ok(toNote(rows[0]));
	});

const deleteNote = server
	.implement(deleteNoteContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context, touch }) => {
		const existing = orThrow(
			await context.db.query.Note.findFirst({ where: { id: input.id } }),
		);
		if (!existing) return err(errors.notFound({ id: input.id }));

		orThrow(await context.db.delete(Note).where(eq(Note.id, input.id)));
		touch(NoteModel, input.id);
		return ok({ id: input.id });
	});

// ------------------------------------------------------------- comments

const canModerate = (
	row: typeof Comment.$inferSelect,
	viewer: { username: string; isAdmin: boolean },
) => row.authorGithubUsername === viewer.username || viewer.isAdmin;

/**
 * Public. Runs behind the optional session layer, so a signed-out reader gets
 * the thread minus anything moderated away, and an admin gets everything —
 * with `isHidden` intact so the row can render dimmed.
 */
const listComments = server
	.implement(listCommentsContract)
	.use(session)
	.handler(async ({ input, context }) => {
		const rows = orThrow(
			await context.db.query.Comment.findMany({
				where: { postSlug: input.postSlug },
				orderBy: { createdAt: "asc" },
			}),
		);
		const visible = context.viewer?.isAdmin ? rows : rows.filter((row) => !row.isHidden);
		return ok(visible.map(toComment));
	});

const createComment = server
	.implement(createCommentContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context }) => {
		// The avatar and GitHub id are denormalized onto the row, so a GitHub
		// outage is a declared, retryable failure rather than a thrown 500 that
		// loses what the reader typed.
		const author = await getGithubUser(context.viewer.username);
		if (author.isErr()) return err(errors.authorUnavailable());

		const inserted = await tryDb(
			rawDb
				.insert(Comment)
				.values({
					postSlug: input.postSlug,
					authorGithubId: author.value.id,
					authorGithubUsername: author.value.login,
					authorAvatarUrl: author.value.avatar_url,
					content: input.content,
				})
				.returning(),
		);

		if (inserted.isErr()) {
			const cause = inserted.error;
			// `post_slug` is a foreign key, so "commenting on a post that
			// was just deleted" is the database's answer rather than a
			// pre-flight SELECT that could go stale between check and
			// insert.
			if (isConstraintViolation(cause)) {
				return err(errors.notFound({ slug: input.postSlug }));
			}
			throw cause; // the defect channel: incidentId'd server/internal
		}

		return ok(toComment(inserted.value[0]));
	});

const updateComment = server
	.implement(updateCommentContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context }) => {
		const existing = orThrow(
			await context.db.query.Comment.findFirst({ where: { id: input.id } }),
		);
		if (!existing) return err(errors.notFound({ id: input.id }));
		if (!canModerate(existing, context.viewer)) return err(errors.notAuthor({ id: input.id }));

		const rows = orThrow(
			await tryDb(
				rawDb
					.update(Comment)
					.set({ content: input.content })
					.where(eq(Comment.id, input.id))
					.returning(),
			),
		);

		return ok(toComment(rows[0]));
	});

const setCommentHidden = server
	.implement(setCommentHiddenContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const existing = orThrow(
			await context.db.query.Comment.findFirst({ where: { id: input.id } }),
		);
		if (!existing) return err(errors.notFound({ id: input.id }));

		const rows = orThrow(
			await tryDb(
				rawDb
					.update(Comment)
					.set({ isHidden: input.hidden })
					.where(eq(Comment.id, input.id))
					.returning(),
			),
		);

		return ok(toComment(rows[0]));
	});

const deleteComment = server
	.implement(deleteCommentContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context, touch }) => {
		const existing = orThrow(
			await context.db.query.Comment.findFirst({ where: { id: input.id } }),
		);
		if (!existing) return err(errors.notFound({ id: input.id }));
		if (!canModerate(existing, context.viewer)) return err(errors.notAuthor({ id: input.id }));

		orThrow(await context.db.delete(Comment).where(eq(Comment.id, input.id)));
		touch(CommentModel, input.id);
		return ok({ id: input.id });
	});

// -------------------------------------------------- link check and stats

const checkLinks = server
	.implement(checkLinksContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const posts = orThrow(await context.db.query.Post.findMany());
		return ok(await checkPostLinks(posts, env.SITE_URL));
	});

const toChartPoints = (
	rows: readonly { date: string; visitors: number; visits: number; pageviews: number }[],
): ChartPoint[] =>
	rows.map((row) => ({
		date: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
		Visitors: row.visitors,
		Visits: row.visits,
		Pageviews: row.pageviews,
	}));

const statsOverview = server
	.implement(statsOverviewContract)
	.use(requireAdmin)
	.handler(async ({ errors }) => {
		const stats = createStatsClient();
		const [daily, weekly, pageviews] = await Promise.all([
			stats.getDailyVisits("30d"),
			stats.getWeeklyVisits("6mo"),
			stats.getPageviews("7d"),
		]);

		// One panel, one outcome: the dashboard renders "Failed to load stats"
		// and cannot do anything different for a 500 than for a schema mismatch.
		if (daily.isErr() || weekly.isErr() || pageviews.isErr()) {
			return err(errors.unavailable());
		}

		const pageviewsBySlug: Record<string, number> = {};
		for (const [path, views] of pageviews.value) {
			const slug = path.replace(/^\//, "");
			if (slug) pageviewsBySlug[slug] = views;
		}

		return ok({
			daily: toChartPoints(daily.value),
			weekly: toChartPoints(weekly.value),
			pageviewsBySlug,
		});
	});

// ------------------------------------------------------------------ cli

const oauthConfig = server
	.implement(cliContract.oauthConfig)
	.handler(() => ok({ clientId: env.GITHUB_CLIENT_ID }));

const exchangeCliToken = server
	.implement(cliContract.exchangeToken)
	.use(requireAdmin)
	// HMAC signing over a string this process just built. There is no declared
	// failure here — if WebCrypto rejects, that is a defect, and the framework
	// turns it into a sanitized `server/internal` with an incident id rather
	// than a tag the CLI would have to render.
	.handler(async ({ context }) => ok({ token: await createCliToken(context.viewer.username) }));

/** Composed into the app router by src/rpc/server.ts. */
export const postsRouter = {
	list: listPosts,
	export: exportPosts,
	bySlug: postBySlug,
	create: createPost,
	update: updatePost,
	setPublished,
	remove: deletePost,
};

export const categoriesRouter = {
	list: listCategories,
	create: createCategory,
	remove: deleteCategory,
};

export const notesRouter = {
	list: listNotes,
	create: createNote,
	update: updateNote,
	remove: deleteNote,
};

export const commentsRouter = {
	list: listComments,
	create: createComment,
	update: updateComment,
	setHidden: setCommentHidden,
	remove: deleteComment,
};

export const linksRouter = { check: checkLinks };
export const statsRouter = { overview: statsOverview };
export const cliRouter = { oauthConfig, exchangeToken: exchangeCliToken };
