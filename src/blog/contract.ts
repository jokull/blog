/**
 * The blog half of the contract — posts, notes, categories, the link checker,
 * the stats panel and the CLI's two auth endpoints.
 *
 * Posts have exactly one write path per operation, shared by both front ends —
 * the dashboard and the CLI. In particular `posts.setPublished` is the single
 * definition of what publishing means, so the two cannot drift on it.
 *
 * `setPublished` also promotes any leftover `previewMarkdown` into `markdown`,
 * so a stored draft is never stranded behind a published body.
 *
 * BROWSER-SAFE: codecs, error definitions and invalidation maps. No handlers,
 * no Drizzle driver, no session secret.
 */
import { pickErrors, wire } from "result-rpc";
import { app } from "@/src/rpc/app";
import { authErrors, signInErrors } from "@/src/rpc/auth";
import { categoryErrors, commentErrors, noteErrors, postErrors, statsErrors } from "./errors";
import {
	BrokenLinkCodec,
	CategoryView,
	CommentView,
	LocaleCodec,
	NoteView,
	PostFull,
	PostRow,
	StatsOverviewCodec,
} from "./models";
import {
	CategoryLabelSchema,
	CategorySlugSchema,
	CommentContentSchema,
	NoteIdSchema,
	PostSlugSchema,
	PostTitleSchema,
} from "./schemas";

/**
 * Every blog procedure runs behind AdminLayer, which declares both `auth`
 * tags: signed out is `auth/required` (the shell redirects to GitHub), signed
 * in as anyone but `jokull` is `auth/forbidden` (the screen says so). Listing
 * the pair here is what makes them part of each procedure's closed union.
 */
const adminAuth = authErrors;

/**
 * The typed fields adopt the same Valibot schemas the forms and the CLI run,
 * through `wire.standard`. So "a post must have a title" is declared once and
 * enforced at every boundary, rather than only in whichever front end happens
 * to have an opinion.
 *
 * The stable `id`s participate in the contract digest: bump them whenever the
 * accepted shape or semantics change, so skewed clients are detected.
 */
const slugInput = wire.standard(PostSlugSchema, { id: "post-slug/v1" });
const titleInput = wire.standard(PostTitleSchema, { id: "post-title/v1" });
const categorySlugInput = wire.standard(CategorySlugSchema, { id: "category-slug/v1" });
const categoryLabelInput = wire.standard(CategoryLabelSchema, { id: "category-label/v1" });
const noteIdInput = wire.standard(NoteIdSchema, { id: "note-id/v1" });

const nullableString = wire.nullable(wire.string);

// ---------------------------------------------------------------- posts

/** The dashboard table and `blog list`. A projection without the bodies. */
export const listPostsContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.array(PostRow))
	.errors(adminAuth)
	.query();

/**
 * Whole rows, for `blog backup` only. Kept separate from `posts.list` so the
 * dashboard never pays for every post's markdown, and so the expensive read is
 * something you have to ask for by name.
 */
export const exportPostsContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.array(PostFull))
	.errors(adminAuth)
	.query();

export const postBySlugContract = app
	.procedure()
	.input(wire.object({ slug: wire.string }))
	.output(PostFull)
	.errors({ ...adminAuth, ...pickErrors(postErrors, "notFound") })
	.query();

export const createPostContract = app
	.procedure()
	.input(
		wire.object({
			slug: slugInput,
			title: titleInput,
			markdown: wire.string,
			locale: LocaleCodec,
			categorySlug: nullableString,
			heroImage: nullableString,
			publish: wire.boolean,
		}),
	)
	.output(PostFull)
	.errors({
		...adminAuth,
		...pickErrors(postErrors, "slugTaken"),
		...pickErrors(categoryErrors, "notFound"),
	})
	.affects(listPostsContract)
	.affects(exportPostsContract)
	.mutation();

/**
 * A partial patch guarded by `expectedRevision`. Every field is optional and
 * `undefined` means "leave it alone" — which is why `categorySlug` and
 * `heroImage` are `string | null | undefined`: null clears, absent keeps.
 *
 * Publishing is deliberately NOT here. It has its own procedure because it is
 * not a column assignment.
 */
export const updatePostContract = app
	.procedure()
	.input(
		wire.object({
			slug: wire.string,
			expectedRevision: wire.number,
			title: wire.optional(titleInput),
			markdown: wire.optional(wire.string),
			publishedAt: wire.optional(wire.date),
			locale: wire.optional(LocaleCodec),
			categorySlug: wire.optional(nullableString),
			heroImage: wire.optional(nullableString),
		}),
	)
	.output(PostFull)
	// `category/not-found` is bound to a distinct key: spreading two picks that
	// both spell their key `notFound` would silently drop the first, and the
	// only symptom would be a union missing a member nobody notices until the
	// handler returns a tag the client refuses to decode.
	.errors({
		...adminAuth,
		...pickErrors(postErrors, "notFound", "staleRevision"),
		unknownCategory: categoryErrors.notFound,
	})
	.mutation();

/**
 * THE publish path. Absolute, not a toggle: the admin switch and
 * `blog update --publish` both know the state they want, and a toggle turns a
 * double click into an unpublish.
 *
 * Publishing promotes `previewMarkdown` into `markdown`, clears the draft and
 * re-extracts the hero image, so publishing is never a bare `publicAt`
 * assignment.
 */
export const setPublishedContract = app
	.procedure()
	.input(wire.object({ slug: wire.string, published: wire.boolean }))
	.output(PostFull)
	.errors({ ...adminAuth, ...pickErrors(postErrors, "notFound") })
	.affects(listPostsContract)
	.mutation();

/** A deleted row cannot ride back as an entity, so the handler `touch`es it. */
export const deletePostContract = app
	.procedure()
	.input(wire.object({ slug: wire.string }))
	.output(wire.object({ slug: wire.string }))
	.errors({ ...adminAuth, ...pickErrors(postErrors, "notFound") })
	.affects(listPostsContract)
	.affects(exportPostsContract)
	.mutation();

export const postsContract = {
	list: listPostsContract,
	export: exportPostsContract,
	bySlug: postBySlugContract,
	create: createPostContract,
	update: updatePostContract,
	setPublished: setPublishedContract,
	remove: deletePostContract,
};

// ----------------------------------------------------------- categories

export const listCategoriesContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.array(CategoryView))
	.errors(adminAuth)
	.query();

export const createCategoryContract = app
	.procedure()
	.input(wire.object({ slug: categorySlugInput, label: categoryLabelInput }))
	.output(CategoryView)
	.errors({ ...adminAuth, ...pickErrors(categoryErrors, "slugTaken") })
	.affects(listCategoriesContract)
	.mutation();

export const deleteCategoryContract = app
	.procedure()
	.input(wire.object({ slug: wire.string }))
	.output(wire.object({ slug: wire.string }))
	.errors({ ...adminAuth, ...pickErrors(categoryErrors, "notFound", "inUse") })
	.affects(listCategoriesContract)
	.mutation();

export const categoriesContract = {
	list: listCategoriesContract,
	create: createCategoryContract,
	remove: deleteCategoryContract,
};

// ---------------------------------------------------------------- notes

export const listNotesContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.array(NoteView))
	.errors(adminAuth)
	.query();

export const createNoteContract = app
	.procedure()
	.input(
		wire.object({
			id: noteIdInput,
			description: nullableString,
			publish: wire.boolean,
		}),
	)
	.output(NoteView)
	.errors({ ...adminAuth, ...pickErrors(noteErrors, "idTaken") })
	.affects(listNotesContract)
	.mutation();

export const updateNoteContract = app
	.procedure()
	.input(
		wire.object({
			id: wire.string,
			description: wire.optional(nullableString),
			publish: wire.optional(wire.boolean),
		}),
	)
	.output(NoteView)
	.errors({ ...adminAuth, ...pickErrors(noteErrors, "notFound") })
	.mutation();

export const deleteNoteContract = app
	.procedure()
	.input(wire.object({ id: wire.string }))
	.output(wire.object({ id: wire.string }))
	.errors({ ...adminAuth, ...pickErrors(noteErrors, "notFound") })
	.affects(listNotesContract)
	.mutation();

export const notesContract = {
	list: listNotesContract,
	create: createNoteContract,
	update: updateNoteContract,
	remove: deleteNoteContract,
};

// ------------------------------------------------------------- comments

const commentInput = wire.standard(CommentContentSchema, { id: "comment-content/v1" });

/**
 * Public — the only procedure in this file that is. Comments are part of the
 * article, so this runs behind the optional session layer rather than
 * AdminLayer: a signed-out reader gets the visible comments, and only an admin
 * sees the hidden ones.
 */
export const listCommentsContract = app
	.procedure()
	.input(wire.object({ postSlug: wire.string }))
	.output(wire.array(CommentView))
	.query();

/**
 * `.affects` is keyed on the post, so posting a comment refills that post's
 * thread and nothing else. The row also rides back as an entity, so the
 * optimistic placeholder is replaced in place rather than by a refetch.
 */
export const createCommentContract = app
	.procedure()
	.input(wire.object({ postSlug: wire.string, content: commentInput }))
	.output(CommentView)
	.errors({
		...signInErrors,
		...pickErrors(commentErrors, "authorUnavailable"),
		...pickErrors(postErrors, "notFound"),
	})
	.affects(listCommentsContract, (input) => ({ postSlug: input.postSlug }))
	.mutation();

export const updateCommentContract = app
	.procedure()
	.input(wire.object({ id: wire.number, content: commentInput }))
	.output(CommentView)
	.errors({ ...signInErrors, ...pickErrors(commentErrors, "notFound", "notAuthor") })
	.mutation();

/** Admin moderation. Returns the entity, so the row dims in place. */
export const setCommentHiddenContract = app
	.procedure()
	.input(wire.object({ id: wire.number, hidden: wire.boolean }))
	.output(CommentView)
	.errors({ ...authErrors, ...pickErrors(commentErrors, "notFound") })
	.mutation();

/**
 * `postSlug` is in the input purely so `.affects` can name the one thread to
 * invalidate — a deleted row cannot carry it back, and invalidating every
 * thread because one comment went away would be worse than the refetch.
 */
export const deleteCommentContract = app
	.procedure()
	.input(wire.object({ id: wire.number, postSlug: wire.string }))
	.output(wire.object({ id: wire.number }))
	.errors({ ...signInErrors, ...pickErrors(commentErrors, "notFound", "notAuthor") })
	.affects(listCommentsContract, (input) => ({ postSlug: input.postSlug }))
	.mutation();

export const commentsContract = {
	list: listCommentsContract,
	create: createCommentContract,
	update: updateCommentContract,
	setHidden: setCommentHiddenContract,
	remove: deleteCommentContract,
};

// -------------------------------------------------- link check and stats

/**
 * A mutation, not a query: it fetches every outbound URL in every post and the
 * dashboard runs it from a button. Modelling it as a query would invite a cache
 * to refetch it.
 */
export const checkLinksContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.array(BrokenLinkCodec))
	.errors(adminAuth)
	.mutation();

export const statsOverviewContract = app
	.procedure()
	.input(wire.object({}))
	.output(StatsOverviewCodec)
	.errors({ ...adminAuth, ...statsErrors })
	.query();

// ------------------------------------------------------------------ cli

/**
 * Public. The GitHub OAuth client id is not a secret — it appears in every
 * authorization URL — and `blog login` needs it before it has any credential
 * to present.
 */
export const oauthConfigContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.object({ clientId: wire.string }))
	.query();

/**
 * Exchanges the GitHub token that `blog login`'s device flow just obtained for
 * a signed CLI token. Authenticated by the session layer like everything else:
 * the caller presents `Authorization: Bearer <github token>`, the middleware
 * resolves it to a viewer, and AdminLayer decides whether that viewer may have
 * one.
 */
export const exchangeCliTokenContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.object({ token: wire.string }))
	.errors(adminAuth)
	.mutation();

export const cliContract = {
	oauthConfig: oauthConfigContract,
	exchangeToken: exchangeCliTokenContract,
};
