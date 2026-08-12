/**
 * SERVER-ONLY: the kitty handlers. This module closes over the D1 binding and
 * keeps the RPC layer free of database imports.
 */
import { Result } from "better-result";
import { isFetchUnreachable, safeFetchJson, safeFetchText } from "@/lib/safe-utils";
import { err, ok } from "result-rpc";
import { type Selectable } from "kysely";
import { decodeTheme } from "@/db";
import type { Viewer } from "@/src/rpc/auth";
import { fetchAuthor, requireViewer, server, session } from "@/src/rpc/server-base";
import type { KittyThemeTable } from "@/schema";
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

function generateSlug(name: string) {
	return `${name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;
}

/** `colors` crosses the wire as an object but is stored as JSON text. */
function encodeColors(colors: SavedTheme["colors"]): string {
	return JSON.stringify(colors);
}

function canWrite(row: Selectable<KittyThemeTable>, viewer: Viewer) {
	return row.author_github_username === viewer.username || viewer.isAdmin;
}

const published = server.implement(publishedThemesContract).handler(async ({ context }) => {
	// A read with no declared failure: the query either answers or it is
	// scenario C — `unwrap` throws a Panic and the framework turns that
	// into a sanitized server/internal with an incident id.
	const rows = (
		await context.db
			.selectFrom("kitty_theme")
			.selectAll()
			.where("is_published", "=", true)
			.orderBy("created_at", "desc")
			.execute()
	).unwrap();
	return ok(rows.map(decodeTheme));
});

const mine = server
	.implement(myThemesContract)
	.use(requireViewer)
	.handler(async ({ context }) => {
		const rows = (
			await context.db
				.selectFrom("kitty_theme")
				.selectAll()
				.where("author_github_username", "=", context.viewer.username)
				.orderBy("created_at", "desc")
				.execute()
		).unwrap();
		return ok(rows.map(decodeTheme));
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
				await context.db
					.selectFrom("kitty_theme")
					.selectAll()
					.where("id", "=", input.id)
					.executeTakeFirst()
			).unwrap();
			// An unpublished theme is `theme/not-found` to anyone but its owner and
			// admins. Hiding existence is the point, so this deliberately does not
			// distinguish "no such theme" from "not yours" — that would be a disclosure.
			if (
				!row ||
				(!row.is_published && (context.viewer === null || !canWrite(row, context.viewer)))
			) {
				return yield* err(errors.notFound({ themeId: input.id }));
			}
			return ok(decodeTheme(row));
		}),
	);

const create = server
	.implement(createThemeContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			// The author's avatar and id are stamped onto the row, so a GitHub outage
			// is a declared, retryable failure rather than an unhandled throw.
			const author = yield* await fetchAuthor(context.viewer, () =>
				errors.authorUnavailable(),
			);

			// The insert has no declared fold: any database failure is scenario C.
			const row = (
				await context.db
					.insertInto("kitty_theme")
					.values({
						slug: generateSlug(input.name),
						name: input.name,
						blurb: input.blurb,
						colors: encodeColors(input.colors),
						author_github_id: author.id,
						author_github_username: author.login,
						author_avatar_url: author.avatar_url,
						is_published: false,
						created_at: new Date(),
					})
					.returningAll()
					.executeTakeFirstOrThrow()
			).unwrap();
			return ok(decodeTheme(row));
		}),
	);

const update = server
	.implement(updateThemeContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			const existing = (
				await context.db
					.selectFrom("kitty_theme")
					.selectAll()
					.where("id", "=", input.id)
					.executeTakeFirst()
			).unwrap();
			if (!existing) return yield* err(errors.notFound({ themeId: input.id }));
			if (!canWrite(existing, context.viewer)) {
				return yield* err(errors.notOwner({ themeId: input.id }));
			}

			const row = (
				await context.db
					.updateTable("kitty_theme")
					.set({
						name: input.name,
						blurb: input.blurb,
						colors: encodeColors(input.colors),
						modified_at: new Date(),
					})
					.where("id", "=", input.id)
					.returningAll()
					.executeTakeFirstOrThrow()
			).unwrap();
			return ok(decodeTheme(row));
		}),
	);

const togglePublish = server
	.implement(togglePublishContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			const existing = (
				await context.db
					.selectFrom("kitty_theme")
					.selectAll()
					.where("id", "=", input.id)
					.executeTakeFirst()
			).unwrap();
			if (!existing) return yield* err(errors.notFound({ themeId: input.id }));
			if (!canWrite(existing, context.viewer)) {
				return yield* err(errors.notOwner({ themeId: input.id }));
			}

			const row = (
				await context.db
					.updateTable("kitty_theme")
					.set({
						is_published: !existing.is_published,
						modified_at: new Date(),
					})
					.where("id", "=", input.id)
					.returningAll()
					.executeTakeFirstOrThrow()
			).unwrap();
			return ok(decodeTheme(row));
		}),
	);

const fork = server
	.implement(forkThemeContract)
	.use(requireViewer)
	.handler(({ input, errors, context }) =>
		Result.gen(async function* () {
			const original = (
				await context.db
					.selectFrom("kitty_theme")
					.selectAll()
					.where("id", "=", input.id)
					.executeTakeFirst()
			).unwrap();
			if (!original) return yield* err(errors.notFound({ themeId: input.id }));
			if (!original.is_published) {
				return yield* err(errors.forkUnpublished({ themeId: input.id }));
			}

			const author = yield* await fetchAuthor(context.viewer, () =>
				errors.authorUnavailable(),
			);

			const row = (
				await context.db
					.insertInto("kitty_theme")
					.values({
						slug: generateSlug(`${original.name} remix`),
						name: `${original.name} (Remix)`,
						blurb: original.blurb,
						colors: original.colors,
						author_github_id: author.id,
						author_github_username: author.login,
						author_avatar_url: author.avatar_url,
						forked_from_id: original.id,
						is_published: false,
						created_at: new Date(),
					})
					.returningAll()
					.executeTakeFirstOrThrow()
			).unwrap();
			return ok(decodeTheme(row));
		}),
	);

const remove = server
	.implement(deleteThemeContract)
	.use(requireViewer)
	.handler(({ input, errors, context, touch }) =>
		Result.gen(async function* () {
			const existing = (
				await context.db
					.selectFrom("kitty_theme")
					.selectAll()
					.where("id", "=", input.id)
					.executeTakeFirst()
			).unwrap();
			if (!existing) return yield* err(errors.notFound({ themeId: input.id }));
			if (!canWrite(existing, context.viewer)) {
				return yield* err(errors.notOwner({ themeId: input.id }));
			}

			(
				await context.db.deleteFrom("kitty_theme").where("id", "=", input.id).execute()
			).unwrap();
			// A deleted row cannot ride back as an entity, so invalidate by identity.
			touch(KittyThemeModel, input.id);
			return ok({ id: input.id });
		}),
	);

const UPSTREAM = "https://raw.githubusercontent.com/kovidgoyal/kitty-themes/master";

/**
 * `safeFetchJson` is the border checkpoint: unreachable, non-2xx and malformed
 * JSON become private `fetch/*` tags here rather than escaping as defects.
 * All of them collapse to one declared tag, because a component rendering the
 * community list cannot act differently on "offline" versus "malformed JSON".
 */
function fetchIndex() {
	return Result.gen(async function* () {
		const payload = yield* (await safeFetchJson(`${UPSTREAM}/themes.json`))
			.tapError(isFetchUnreachable)
			.mapError(() => communityErrors.unavailable());
		return ok(themeIndexEntries(payload));
	});
}

const communityList = server.implement(communityListContract).handler(() => fetchIndex());

const communityBySlug = server.implement(communityBySlugContract).handler(({ input, errors }) =>
	Result.gen(async function* () {
		const index = yield* await fetchIndex();
		const meta = index.find((entry) => entry.slug === input.slug);
		if (!meta) return yield* err(errors.notFound({ slug: input.slug }));

		const config = yield* (await safeFetchText(`${UPSTREAM}/${meta.file}`)).mapError(
			// An upstream that answered wrong is a defect in the index/config
			// relationship, not the reader's network: isFetchUnreachable logs it,
			// and we cloak the real cause behind the same not-found the page
			// shows for a bad slug. Only offline keeps the declared unavailable.
			(e) =>
				isFetchUnreachable(e)
					? errors.unavailable()
					: errors.notFound({ slug: input.slug }),
		);

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
