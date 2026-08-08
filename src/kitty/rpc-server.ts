/**
 * SERVER-ONLY: the kitty handlers. This module closes over the D1 binding and
 * the iron-session secret. Nothing in the browser graph may reach it — it is
 * reachable only from src/rpc/server.ts, which the `/api/rpc` route and the
 * `createServerFn` prefetchers in ssr.ts import, and which TanStack Start
 * strips from the client build.
 *
 * Every handler here was a `throw new Error("...")` in app/kitty/mutations.ts.
 * They return declared failures now, so the union a component can be asked to
 * render is exactly the union this file can produce.
 */
import { eq } from "drizzle-orm";
import { Result } from "better-result";
import { err, ok } from "result-rpc";
import { getGithubUser } from "@/auth";
import { db } from "@/db";
import type { Viewer } from "@/src/rpc/auth";
import { requireViewer, server, session } from "@/src/rpc/server-base";
import { KittyTheme } from "@/schema";
import {
	communityBySlugContract,
	communityListContract,
	createThemeContract,
	deleteThemeContract,
	forkThemeContract,
	myThemesContract,
	publishedThemesContract,
	themeByIdContract,
	togglePublishContract,
	updateThemeContract,
} from "./contract";
import { communityErrors } from "./errors";
import { defaultThemeColors } from "./lib/default-theme";
import { parseThemeConfig, themeIndexEntries } from "./lib/theme-parser";
import { KittyThemeModel, type SavedTheme } from "./models";

const generateSlug = (name: string) =>
	`${name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;

/** The Drizzle row mapped to the model's exact shape — the drift boundary. */
const toTheme = (row: typeof KittyTheme.$inferSelect): SavedTheme => ({
	id: row.id,
	slug: row.slug,
	name: row.name,
	authorGithubId: row.authorGithubId,
	authorGithubUsername: row.authorGithubUsername,
	authorAvatarUrl: row.authorAvatarUrl,
	isPublished: row.isPublished,
	forkedFromId: row.forkedFromId,
	blurb: row.blurb,
	colors: row.colors,
	createdAt: row.createdAt,
	modifiedAt: row.modifiedAt,
});

const canWrite = (row: typeof KittyTheme.$inferSelect, viewer: Viewer) =>
	row.authorGithubUsername === viewer.username || viewer.isAdmin;

const published = server.implement(publishedThemesContract).handler(async ({ context }) => {
	// A read with no declared failure: the query either answers or it is
	// scenario C — `unwrap` throws a Panic and the framework turns that
	// into a sanitized server/internal with an incident id.
	const rows = (
		await context.db.query.KittyTheme.findMany({
			where: { isPublished: true },
			orderBy: { createdAt: "desc" },
		})
	).unwrap();
	return ok(rows.map(toTheme));
});

const mine = server
	.implement(myThemesContract)
	.use(requireViewer)
	.handler(async ({ context }) => {
		const rows = (
			await context.db.query.KittyTheme.findMany({
				where: { authorGithubUsername: context.viewer.username },
				orderBy: { createdAt: "desc" },
			})
		).unwrap();
		return ok(rows.map(toTheme));
	});

/**
 * An unpublished theme is `theme/not-found` to anyone but its owner and
 * admins. Hiding existence is the point, so this deliberately does not
 * distinguish "no such theme" from "not yours" — that would be a disclosure.
 */
const byId = server
	.implement(themeByIdContract)
	.use(session)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			const row = (
				await context.db.query.KittyTheme.findFirst({ where: { id: input.id } })
			).unwrap();
			// An unpublished theme is `theme/not-found` to anyone but its owner and
			// admins. Hiding existence is the point, so this deliberately does not
			// distinguish "no such theme" from "not yours" — that would be a disclosure.
			if (
				!row ||
				(!row.isPublished && (context.viewer === null || !canWrite(row, context.viewer)))
			) {
				return yield* err(errors.notFound({ themeId: input.id }));
			}
			return ok(toTheme(row));
		}),
	);

const create = server
	.implement(createThemeContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			// The author's avatar and id are stamped onto the row, so a GitHub outage
			// is a declared, retryable failure rather than an unhandled throw.
			const author = yield* (await getGithubUser(context.viewer.username)).mapError(() =>
				errors.authorUnavailable(),
			);

			// The insert has no declared fold: any database failure is scenario C.
			const [row] = (
				await db
					.insert(KittyTheme)
					.values({
						slug: generateSlug(input.name),
						name: input.name,
						blurb: input.blurb,
						colors: input.colors,
						authorGithubId: author.id,
						authorGithubUsername: author.login,
						authorAvatarUrl: author.avatar_url,
						isPublished: false,
					})
					.returning()
			).unwrap();
			return ok(toTheme(row));
		}),
	);

const update = server
	.implement(updateThemeContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			const existing = (
				await context.db.query.KittyTheme.findFirst({ where: { id: input.id } })
			).unwrap();
			if (!existing) return yield* err(errors.notFound({ themeId: input.id }));
			if (!canWrite(existing, context.viewer)) {
				return yield* err(errors.notOwner({ themeId: input.id }));
			}

			const [row] = (
				await db
					.update(KittyTheme)
					.set({
						name: input.name,
						blurb: input.blurb,
						colors: input.colors,
						modifiedAt: new Date(),
					})
					.where(eq(KittyTheme.id, input.id))
					.returning()
			).unwrap();
			return ok(toTheme(row));
		}),
	);

const togglePublish = server
	.implement(togglePublishContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			const existing = (
				await context.db.query.KittyTheme.findFirst({ where: { id: input.id } })
			).unwrap();
			if (!existing) return yield* err(errors.notFound({ themeId: input.id }));
			if (!canWrite(existing, context.viewer)) {
				return yield* err(errors.notOwner({ themeId: input.id }));
			}

			const [row] = (
				await db
					.update(KittyTheme)
					.set({ isPublished: !existing.isPublished, modifiedAt: new Date() })
					.where(eq(KittyTheme.id, input.id))
					.returning()
			).unwrap();
			return ok(toTheme(row));
		}),
	);

const fork = server
	.implement(forkThemeContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			const original = (
				await context.db.query.KittyTheme.findFirst({ where: { id: input.id } })
			).unwrap();
			if (!original) return yield* err(errors.notFound({ themeId: input.id }));
			if (!original.isPublished) {
				return yield* err(errors.forkUnpublished({ themeId: input.id }));
			}

			const author = yield* (await getGithubUser(context.viewer.username)).mapError(() =>
				errors.authorUnavailable(),
			);

			const [row] = (
				await db
					.insert(KittyTheme)
					.values({
						slug: generateSlug(`${original.name} remix`),
						name: `${original.name} (Remix)`,
						blurb: original.blurb,
						colors: original.colors,
						authorGithubId: author.id,
						authorGithubUsername: author.login,
						authorAvatarUrl: author.avatar_url,
						forkedFromId: original.id,
						isPublished: false,
					})
					.returning()
			).unwrap();
			return ok(toTheme(row));
		}),
	);

const remove = server
	.implement(deleteThemeContract)
	.use(requireViewer)
	.handler(({ input, errors, context, touch }) =>
		Result.gen(async function* () {
			const existing = (
				await context.db.query.KittyTheme.findFirst({ where: { id: input.id } })
			).unwrap();
			if (!existing) return yield* err(errors.notFound({ themeId: input.id }));
			if (!canWrite(existing, context.viewer)) {
				return yield* err(errors.notOwner({ themeId: input.id }));
			}

			(await context.db.delete(KittyTheme).where(eq(KittyTheme.id, input.id))).unwrap();
			// A deleted row cannot ride back as an entity, so invalidate by identity.
			touch(KittyThemeModel, input.id);
			return ok({ id: input.id });
		}),
	);

const UPSTREAM = "https://raw.githubusercontent.com/kovidgoyal/kitty-themes/master";

/**
 * `tryPromise` is the border checkpoint: fetch's TypeError and
 * JSON's SyntaxError must become tagged values here or they escape as defects.
 * All of them collapse to one declared tag, because a component rendering the
 * community list cannot act differently on "offline" versus "malformed JSON".
 */
const fetchIndex = () =>
	Result.gen(async function* () {
		const response = yield* await Result.tryPromise({
			try: () => fetch(`${UPSTREAM}/themes.json`),
			catch: () => communityErrors.unavailable(),
		});
		if (!response.ok) return yield* err(communityErrors.unavailable());
		const payload = yield* await Result.tryPromise({
			try: () => response.json(),
			catch: () => communityErrors.unavailable(),
		});
		return ok(themeIndexEntries(payload));
	});

const communityList = server.implement(communityListContract).handler(() => fetchIndex());

const communityBySlug = server.implement(communityBySlugContract).handler(({ input, errors }) =>
	Result.gen(async function* () {
		const index = yield* await fetchIndex();
		const meta = index.find((entry) => entry.slug === input.slug);
		if (!meta) return yield* err(errors.notFound({ slug: input.slug }));

		const config = yield* await Result.tryPromise({
			try: async () => {
				const response = await fetch(`${UPSTREAM}/${meta.file}`);
				if (!response.ok) throw new Error(`upstream ${response.status}`);
				return response.text();
			},
			catch: () => errors.unavailable(),
		});

		// Merged over the default so all 21 colours are always present.
		return ok({
			meta,
			colors: { ...defaultThemeColors, ...parseThemeConfig(config).colors },
		});
	}),
);

/** Composed into the app router by src/rpc/server.ts. */
export const themesRouter = {
	published,
	mine,
	byId,
	create,
	update,
	togglePublish,
	fork,
	remove,
};

export const communityRouter = { list: communityList, bySlug: communityBySlug };
