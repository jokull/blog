/**
 * SERVER-ONLY: the blog handlers.
 *
 * The three-outcome model: handlers declare the failures they know (constraint
 * folds, read guards), return happy paths, and let everything else fall
 * through as a Panic that the framework turns into a sanitized `server/internal`
 * with an incident id.
 */
import { env } from "cloudflare:workers";
import { type Selectable } from "kysely";
import { Result } from "better-result";
import { err, ok, type AnyTaggedError } from "result-rpc";
import { isConstraintViolation, UniqueViolation, ForeignKeyViolation } from "db-result";
import { decodeCategory, decodeComment, decodeNote, decodePost, epoch } from "@/db";
import { Temporal } from "temporal-polyfill";
import { createCliToken } from "@/lib/cli-token";
import { checkPostLinks } from "@/lib/link-checker";
import { extractFirstImage } from "@/lib/mdx-image-extractor";
import { createStatsClient } from "@/lib/onedollarstats";
import type { CommentTable, NoteTable, PostTable, StoredPost } from "@/schema";
import { renderCommentHtml } from "./comment-markdown";
import { fetchAuthor, requireAdmin, requireViewer, server, session } from "@/src/rpc/server-base";
import {
	CommentModel,
	NoteModel,
	PostModel,
	type SavedComment,
	type ChartPoint,
	type PostRowValue,
} from "./models";
import {
	checkLinksContract,
	cliContract,
	createCategoryContract,
	createCommentContract,
	createNoteContract,
	createPostContract,
	deleteCategoryContract,
	deleteCommentContract,
	deleteNoteContract,
	deletePostContract,
	exportPostsContract,
	listCategoriesContract,
	listCommentsContract,
	listNotesContract,
	listPostsContract,
	postBySlugContract,
	setCommentHiddenContract,
	setPublishedContract,
	statsOverviewContract,
	updateCommentContract,
	updateNoteContract,
	updatePostContract,
} from "./contract";

/**
 * The table projection. `PostRow` is a strict view — it validates an exact
 * shape rather than stripping a wider one — so the bodies are dropped here on
 * purpose: `posts.list` cannot accidentally ship every post's markdown.
 */
const toPostRow = (post: StoredPost): PostRowValue => ({
	slug: post.slug,
	title: post.title,
	locale: post.locale,
	revision: post.revision,
	publicAt: post.publicAt,
	createdAt: post.createdAt,
	publishedAt: post.publishedAt,
	modifiedAt: post.modifiedAt,
	heroImage: post.heroImage,
	categorySlug: post.categorySlug,
});

/**
 * `contentHtml` is rendered here rather than stored, so a change to the
 * renderer or the token CSS takes effect on the next read instead of needing a
 * backfill over every comment ever written. Rendering on read is cheap:
 * `@tanstack/highlight` is a synchronous tokenizer with no WASM and no async
 * init.
 */
const toComment = (row: Selectable<CommentTable>): SavedComment => ({
	...decodeComment(row),
	contentHtml: renderCommentHtml(row.content),
});

/**
 * The single-tag constraint fold: when the database rejected the write with a
 * constraint violation, the caller's declared error is the answer; anything
 * else keeps falling through the cracks to scenario C.
 */
const constraintTo =
	<E extends AnyTaggedError>(toDeclared: () => E) =>
	(e: unknown): Result<never, E> => {
		if (isConstraintViolation(e)) return err(toDeclared());
		throw e;
	};

// ------------------------------------------------------------------ posts

const listPosts = server
	.implement(listPostsContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		// A read with no declared failure: the query either answers or it is
		// scenario C — `unwrap` throws a Panic and the framework turns that
		// into a sanitized server/internal with an incident id.
		const rows = (
			await context.db.selectFrom("post").selectAll().orderBy("public_at", "desc").execute()
		).unwrap();
		return ok(rows.map((row) => toPostRow(decodePost(row))));
	});

const exportPosts = server
	.implement(exportPostsContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const rows = (
			await context.db.selectFrom("post").selectAll().orderBy("public_at", "desc").execute()
		).unwrap();
		return ok(rows.map(decodePost));
	});

const postBySlug = server
	.implement(postBySlugContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const row = (
			await context.db
				.selectFrom("post")
				.selectAll()
				.where("slug", "=", input.slug)
				.executeTakeFirst()
		).unwrap();
		return row ? ok(decodePost(row)) : err(errors.notFound({ slug: input.slug }));
	});

const createPost = server
	.implement(createPostContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const now = new Date();
		// The database owns both rules — `slug` is the primary key and
		// `category_slug` a foreign key — so the insert's constraint tags are
		// subtracted to declared errors right here instead of racing a
		// pre-flight SELECT that could go stale between check and insert.
		// Everything left over is scenario C: it falls through the cracks as
		// an unhandled Panic and becomes a sanitized server/internal with an
		// incident id.
		return (
			await context.db
				.insertInto("post")
				.values({
					slug: input.slug,
					title: input.title,
					markdown: input.markdown,
					preview_markdown: null,
					public_at: input.publish ? Temporal.Now.plainDateISO() : null,
					created_at: epoch(now),
					published_at: epoch(now),
					modified_at: null,
					revision: 1,
					locale: input.locale,
					hero_image: input.heroImage ?? (await extractFirstImage(input.markdown)),
					category_slug: input.categorySlug,
				})
				.returningAll()
				.executeTakeFirstOrThrow()
		)
			.tryRecover((e) => {
				if (UniqueViolation.is(e)) {
					return err(errors.slugTaken({ slug: input.slug }));
				}
				if (ForeignKeyViolation.is(e)) {
					return err(errors.notFound({ slug: input.categorySlug ?? "" }));
				}
				throw e; // scenario C: the rest falls through the cracks
			})
			.map(decodePost);
	});

const updatePost = server
	.implement(updatePostContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const row = (
			await context.db
				.selectFrom("post")
				.selectAll()
				.where("slug", "=", input.slug)
				.executeTakeFirst()
		).unwrap();
		if (!row) return err(errors.notFound({ slug: input.slug }));
		const existing = decodePost(row);
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
			const category = (
				await context.db
					.selectFrom("category")
					.selectAll()
					.where("slug", "=", input.categorySlug)
					.executeTakeFirst()
			).unwrap();
			if (!category) return err(errors.unknownCategory({ slug: input.categorySlug }));
		}

		const patch: Partial<PostTable> = {};
		if (input.title !== undefined) patch.title = input.title;
		if (input.publishedAt !== undefined) patch.published_at = epoch(input.publishedAt);
		if (input.locale !== undefined) patch.locale = input.locale;
		if (input.categorySlug !== undefined) patch.category_slug = input.categorySlug;

		if (input.markdown !== undefined) {
			// Writing the body supersedes any draft, so the preview column is cleared —
			// otherwise the next publish would promote a stale draft over the body this
			// write just landed.
			patch.markdown = input.markdown;
			patch.preview_markdown = null;
		}

		// Precedence: an explicit hero image wins; otherwise a new body's first
		// image follows it; with neither, the column keeps whatever it had.
		if (input.heroImage !== undefined) {
			patch.hero_image = input.heroImage;
		} else if (input.markdown !== undefined) {
			patch.hero_image = await extractFirstImage(input.markdown);
		}

		const updated = (
			await context.db
				.updateTable("post")
				.set({
					...patch,
					modified_at: epoch(new Date()),
					revision: existing.revision + 1,
				})
				// The revision is re-checked in the WHERE clause, not just above, so a
				// writer that slipped in between the SELECT and here loses the race
				// rather than being overwritten by it. The guard makes the plain
				// value equivalent to the SQL increment: success means the row
				// still held `existing.revision` when the write landed.
				.where("slug", "=", input.slug)
				.where("revision", "=", input.expectedRevision)
				.returningAll()
				.executeTakeFirst()
		).unwrap();

		// `undefined` means the revision guard in the WHERE clause rejected the
		// write, which is the whole point of it.
		if (updated === undefined) {
			const current = (
				await context.db
					.selectFrom("post")
					.selectAll()
					.where("slug", "=", input.slug)
					.executeTakeFirst()
			).unwrap();
			if (!current) return err(errors.notFound({ slug: input.slug }));
			return err(
				errors.staleRevision({
					slug: input.slug,
					expected: input.expectedRevision,
					current: current.revision,
				}),
			);
		}

		return ok(decodePost(updated));
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
		const row = (
			await context.db
				.selectFrom("post")
				.selectAll()
				.where("slug", "=", input.slug)
				.executeTakeFirst()
		).unwrap();
		if (!row) return err(errors.notFound({ slug: input.slug }));
		const existing = decodePost(row);

		// Absolute, not a toggle: asking for the state it is already in is a
		// no-op rather than a flip, so a double click cannot unpublish.
		if ((existing.publicAt !== null) === input.published) return ok(existing);

		const markdown = input.published
			? (existing.previewMarkdown ?? existing.markdown)
			: existing.markdown;
		const heroImage = markdown ? await extractFirstImage(markdown) : existing.heroImage;

		const updated = (
			await context.db
				.updateTable("post")
				.set({
					public_at: input.published ? Temporal.Now.plainDateISO() : null,
					markdown,
					preview_markdown: null,
					hero_image: heroImage,
					modified_at: epoch(new Date()),
					revision: existing.revision + 1,
				})
				.where("slug", "=", input.slug)
				.returningAll()
				.executeTakeFirstOrThrow()
		).unwrap();

		return ok(decodePost(updated));
	});

const deletePost = server
	.implement(deletePostContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context, touch }) => {
		const post = (
			await context.db
				.selectFrom("post")
				.selectAll()
				.where("slug", "=", input.slug)
				.executeTakeFirst()
		).unwrap();
		if (!post) return err(errors.notFound({ slug: input.slug }));

		(await context.db.deleteFrom("post").where("slug", "=", input.slug).execute()).unwrap();
		// A deleted row cannot ride back as an entity, so invalidate by identity.
		touch(PostModel, input.slug);
		return ok({ slug: input.slug });
	});

// ------------------------------------------------------------------ categories

const listCategories = server
	.implement(listCategoriesContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const rows = (
			await context.db.selectFrom("category").selectAll().orderBy("label").execute()
		).unwrap();
		return ok(rows.map(decodeCategory));
	});

const createCategory = server
	.implement(createCategoryContract)
	.use(requireAdmin)
	// The slug pattern is enforced by the contract's `wire.standard`, so the
	// only failure left is the one the database owns: the primary key.
	// Everything else is scenario C.
	.handler(async ({ input, errors, context }) =>
		(
			await context.db
				.insertInto("category")
				.values({ slug: input.slug, label: input.label, created_at: epoch(new Date()) })
				.returningAll()
				.executeTakeFirstOrThrow()
		)
			.tryRecover(constraintTo(() => errors.slugTaken({ slug: input.slug })))
			.map(decodeCategory),
	);

const deleteCategory = server
	.implement(deleteCategoryContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const category = (
			await context.db
				.selectFrom("category")
				.selectAll()
				.where("slug", "=", input.slug)
				.executeTakeFirst()
		).unwrap();
		if (!category) return err(errors.notFound({ slug: input.slug }));

		const counted = (
			await context.db
				.selectFrom("post")
				.select(({ fn }) => fn.countAll<number>().as("count"))
				.where("category_slug", "=", input.slug)
				.executeTakeFirst()
		).unwrap();

		const postCount = Number(counted?.count ?? 0);
		if (postCount > 0) return err(errors.inUse({ slug: input.slug, postCount }));

		(await context.db.deleteFrom("category").where("slug", "=", input.slug).execute()).unwrap();
		return ok({ slug: input.slug });
	});

// ------------------------------------------------------------------ notes

const listNotes = server
	.implement(listNotesContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const rows = (
			await context.db.selectFrom("note").selectAll().orderBy("created_at", "desc").execute()
		).unwrap();
		return ok(rows.map(decodeNote));
	});

const createNote = server
	.implement(createNoteContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) =>
		(
			await context.db
				.insertInto("note")
				.values({
					id: input.id,
					description: input.description,
					published_at: input.publish ? epoch(new Date()) : null,
					created_at: epoch(new Date()),
				})
				.returningAll()
				.executeTakeFirstOrThrow()
		)
			// `id` is the primary key, so the database owns this one failure;
			// everything else is scenario C.
			.tryRecover(constraintTo(() => errors.idTaken({ id: input.id })))
			.map(decodeNote),
	);

const updateNote = server
	.implement(updateNoteContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const row = (
			await context.db
				.selectFrom("note")
				.selectAll()
				.where("id", "=", input.id)
				.executeTakeFirst()
		).unwrap();
		if (!row) return err(errors.notFound({ id: input.id }));

		const patch: Partial<NoteTable> = {};
		if (input.description !== undefined) patch.description = input.description;
		if (input.publish !== undefined)
			patch.published_at = input.publish ? epoch(new Date()) : null;

		const updated = (
			await context.db
				.updateTable("note")
				.set(patch)
				.where("id", "=", input.id)
				.returningAll()
				.executeTakeFirstOrThrow()
		).unwrap();

		return ok(decodeNote(updated));
	});

const deleteNote = server
	.implement(deleteNoteContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context, touch }) => {
		const note = (
			await context.db
				.selectFrom("note")
				.selectAll()
				.where("id", "=", input.id)
				.executeTakeFirst()
		).unwrap();
		if (!note) return err(errors.notFound({ id: input.id }));

		(await context.db.deleteFrom("note").where("id", "=", input.id).execute()).unwrap();
		// A deleted row cannot ride back as an entity, so invalidate by identity.
		touch(NoteModel, input.id);
		return ok({ id: input.id });
	});

// ------------------------------------------------------------------ comments

const canModerate = (
	row: Selectable<CommentTable>,
	viewer: { username: string; isAdmin: boolean },
) => row.author_github_username === viewer.username || viewer.isAdmin;

/**
 * Public. Runs behind the optional session layer, so a signed-out reader gets
 * the thread minus anything moderated away, and an admin gets everything —
 * with `isHidden` intact so the row can render dimmed.
 */
const listComments = server
	.implement(listCommentsContract)
	.use(session)
	.handler(async ({ input, context }) => {
		const rows = (
			await context.db
				.selectFrom("comment")
				.selectAll()
				.where("post_slug", "=", input.postSlug)
				.orderBy("created_at")
				.execute()
		).unwrap();
		const visible = context.viewer?.isAdmin ? rows : rows.filter((row) => !row.is_hidden);
		return ok(visible.map(toComment));
	});

const createComment = server
	.implement(createCommentContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			// The avatar and GitHub id are denormalized onto the row, so a GitHub
			// outage is a declared, retryable failure rather than a thrown 500 that
			// loses what the reader typed.
			const author = yield* await fetchAuthor(context.viewer, () =>
				errors.authorUnavailable(),
			);

			const inserted = yield* (
				await context.db
					.insertInto("comment")
					.values({
						post_slug: input.postSlug,
						author_github_id: author.id,
						author_github_username: author.login,
						author_avatar_url: author.avatar_url,
						content: input.content,
						created_at: epoch(new Date()),
						is_hidden: 0,
					})
					.returningAll()
					.executeTakeFirstOrThrow()
			).tryRecover(
				// `post_slug` is a foreign key, so "commenting on a post that
				// was just deleted" is the database's answer rather than a
				// pre-flight SELECT that could go stale between check and
				// insert.
				constraintTo(() => errors.notFound({ slug: input.postSlug })),
			);

			return ok(toComment(inserted));
		}),
	);

const updateComment = server
	.implement(updateCommentContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context }) => {
		const existing = (
			await context.db
				.selectFrom("comment")
				.selectAll()
				.where("id", "=", input.id)
				.executeTakeFirst()
		).unwrap();
		if (!existing) return err(errors.notFound({ id: input.id }));
		if (!canModerate(existing, context.viewer)) return err(errors.notAuthor({ id: input.id }));

		const updated = (
			await context.db
				.updateTable("comment")
				.set({ content: input.content })
				.where("id", "=", input.id)
				.returningAll()
				.executeTakeFirstOrThrow()
		).unwrap();

		return ok(toComment(updated));
	});

const setCommentHidden = server
	.implement(setCommentHiddenContract)
	.use(requireAdmin)
	.handler(async ({ input, errors, context }) => {
		const comment = (
			await context.db
				.selectFrom("comment")
				.selectAll()
				.where("id", "=", input.id)
				.executeTakeFirst()
		).unwrap();
		if (!comment) return err(errors.notFound({ id: input.id }));

		const updated = (
			await context.db
				.updateTable("comment")
				.set({ is_hidden: input.hidden ? 1 : 0 })
				.where("id", "=", input.id)
				.returningAll()
				.executeTakeFirstOrThrow()
		).unwrap();

		return ok(toComment(updated));
	});

const deleteComment = server
	.implement(deleteCommentContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context, touch }) => {
		const existing = (
			await context.db
				.selectFrom("comment")
				.selectAll()
				.where("id", "=", input.id)
				.executeTakeFirst()
		).unwrap();
		if (!existing) return err(errors.notFound({ id: input.id }));
		if (!canModerate(existing, context.viewer)) return err(errors.notAuthor({ id: input.id }));

		(await context.db.deleteFrom("comment").where("id", "=", input.id).execute()).unwrap();
		// A deleted row cannot ride back as an entity, so invalidate by identity.
		touch(CommentModel, input.id);
		return ok({ id: input.id });
	});

// ------------------------------------------------------------------ link check and stats

const checkLinks = server
	.implement(checkLinksContract)
	.use(requireAdmin)
	.handler(async ({ context }) => {
		const rows = (await context.db.selectFrom("post").selectAll().execute()).unwrap();
		return ok(await checkPostLinks(rows.map(decodePost), env.SITE_URL));
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
	.handler(({ errors }) =>
		Result.gen(async function* () {
			const stats = createStatsClient();

			// One panel, one outcome: the dashboard renders "Failed to load stats"
			// and cannot do anything different for a 500 than for a schema
			// mismatch, so any of the three failures collapses to the one tag.
			const [daily, weekly, pageviews] = await Promise.all([
				stats.getDailyVisits("30d"),
				stats.getWeeklyVisits("6mo"),
				stats.getPageviews("7d"),
			]);
			const [dailyVisits, weeklyVisits, pageviewsByPath] = yield* Result.all([
				daily,
				weekly,
				pageviews,
			]).mapError(() => errors.unavailable());

			const pageviewsBySlug: Record<string, number> = {};
			for (const [path, views] of pageviewsByPath) {
				const slug = path.replace(/^\//, "");
				if (slug) pageviewsBySlug[slug] = views;
			}

			return ok({
				daily: toChartPoints(dailyVisits),
				weekly: toChartPoints(weeklyVisits),
				pageviewsBySlug,
			});
		}),
	);

// ------------------------------------------------------------------ cli

const oauthConfig = server
	.implement(cliContract.oauthConfig)
	.handler(() => ok({ clientId: env.GITHUB_CLIENT_ID }));

/**
 * HMAC signing over a string this process just built. There is no declared
 * failure here — if WebCrypto rejects, that is a defect, and the framework
 * turns it into a sanitized `server/internal` with an incident id rather
 * than a tag the CLI would have to render.
 */
const exchangeCliToken = server
	.implement(cliContract.exchangeToken)
	.use(requireAdmin)
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
