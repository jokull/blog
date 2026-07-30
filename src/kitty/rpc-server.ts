/**
 * SERVER-ONLY: request context, layer middleware, handlers, the router, and
 * the fetch-handler mount. This module closes over the D1 binding and the
 * iron-session secret. Nothing in the browser graph may reach it — its only
 * importers are the `/api/rpc` server route and the `createServerFn`
 * prefetchers in ssr.ts, both of which TanStack Start strips from the client
 * build.
 *
 * Every handler here was a `throw new Error("...")` in app/kitty/mutations.ts.
 * They return declared failures now, so the union a component can be asked to
 * render is exactly the union this file can produce.
 */
import { eq } from "drizzle-orm";
import { err, gen, ok, tryPromise } from "result-rpc";
import { createFetchHandler, createServerClient, serverRpc } from "result-rpc/server";
import { getGithubUser, getSession, isAdmin } from "@/auth";
import { db } from "@/db";
import { KittyTheme } from "@/schema";
import {
	communityBySlugContract,
	communityListContract,
	createThemeContract,
	deleteThemeContract,
	forkThemeContract,
	myThemesContract,
	publishedThemesContract,
	sessionContract,
	themeByIdContract,
	togglePublishContract,
	updateThemeContract,
	viewerContract,
} from "./contract";
import { communityErrors } from "./errors";
import { SessionLayer, ViewerLayer, type Viewer } from "./layers";
import { defaultThemeColors } from "./lib/default-theme";
import { parseThemeConfig, themeIndexEntries } from "./lib/theme-parser";
import { KittyThemeModel, type SavedTheme } from "./models";

/** Process/request services. The viewer arrives via the session layer. */
export interface AppContext {
	readonly db: typeof db;
}

const server = serverRpc.context<AppContext>();

/**
 * Reads the iron-session cookie. Declared with no errors, so it always
 * establishes — a signed-out visitor is `viewer: null`, not a failure.
 */
const session = SessionLayer.middleware(server, async () => {
	const cookie = await getSession();
	if (!cookie.githubUsername) return ok(null);
	return ok({ username: cookie.githubUsername, isAdmin: await isAdmin() });
});

/**
 * The refinement. Passing `session` bundles the parent, so a single
 * `.use(requireViewer)` pulls the whole chain in dependency order and
 * contributes `auth/required` to the procedure's declared union.
 */
const requireViewer = ViewerLayer.middleware(server, session);

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
	const rows = await context.db.query.KittyTheme.findMany({
		where: { isPublished: true },
		orderBy: { createdAt: "desc" },
	});
	return ok(rows.map(toTheme));
});

const mine = server
	.implement(myThemesContract)
	.use(requireViewer)
	.handler(async ({ context }) => {
		const rows = await context.db.query.KittyTheme.findMany({
			where: { authorGithubUsername: context.viewer.username },
			orderBy: { createdAt: "desc" },
		});
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
	.handler(async ({ input, errors, context }) => {
		const row = await context.db.query.KittyTheme.findFirst({ where: { id: input.id } });
		if (!row) return err(errors.notFound({ themeId: input.id }));
		if (!row.isPublished && (context.viewer === null || !canWrite(row, context.viewer))) {
			return err(errors.notFound({ themeId: input.id }));
		}
		return ok(toTheme(row));
	});

const create = server
	.implement(createThemeContract)
	.use(requireViewer)
	.handler(async ({ input, context }) => {
		const author = await getGithubUser(context.viewer.username);
		const [row] = await context.db
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
			.returning();
		return ok(toTheme(row));
	});

const update = server
	.implement(updateThemeContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context }) => {
		const existing = await context.db.query.KittyTheme.findFirst({ where: { id: input.id } });
		if (!existing) return err(errors.notFound({ themeId: input.id }));
		if (!canWrite(existing, context.viewer)) return err(errors.notOwner({ themeId: input.id }));

		const [row] = await context.db
			.update(KittyTheme)
			.set({
				name: input.name,
				blurb: input.blurb,
				colors: input.colors,
				modifiedAt: new Date(),
			})
			.where(eq(KittyTheme.id, input.id))
			.returning();
		return ok(toTheme(row));
	});

const togglePublish = server
	.implement(togglePublishContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context }) => {
		const existing = await context.db.query.KittyTheme.findFirst({ where: { id: input.id } });
		if (!existing) return err(errors.notFound({ themeId: input.id }));
		if (!canWrite(existing, context.viewer)) return err(errors.notOwner({ themeId: input.id }));

		const [row] = await context.db
			.update(KittyTheme)
			.set({ isPublished: !existing.isPublished, modifiedAt: new Date() })
			.where(eq(KittyTheme.id, input.id))
			.returning();
		return ok(toTheme(row));
	});

const fork = server
	.implement(forkThemeContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context }) => {
		const original = await context.db.query.KittyTheme.findFirst({ where: { id: input.id } });
		if (!original) return err(errors.notFound({ themeId: input.id }));
		if (!original.isPublished) return err(errors.forkUnpublished({ themeId: input.id }));

		const author = await getGithubUser(context.viewer.username);
		const [row] = await context.db
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
			.returning();
		return ok(toTheme(row));
	});

const remove = server
	.implement(deleteThemeContract)
	.use(requireViewer)
	.handler(async ({ input, errors, context, touch }) => {
		const existing = await context.db.query.KittyTheme.findFirst({ where: { id: input.id } });
		if (!existing) return err(errors.notFound({ themeId: input.id }));
		if (!canWrite(existing, context.viewer)) return err(errors.notOwner({ themeId: input.id }));

		await context.db.delete(KittyTheme).where(eq(KittyTheme.id, input.id));
		// A deleted row cannot ride back as an entity, so invalidate by identity.
		touch(KittyThemeModel, input.id);
		return ok({ id: input.id });
	});

const UPSTREAM = "https://raw.githubusercontent.com/kovidgoyal/kitty-themes/master";

/**
 * `tryPromise` is the border checkpoint: fetch's TypeError and JSON's
 * SyntaxError must become tagged values here or they escape as defects. All of
 * them collapse to one declared tag, because a component rendering the
 * community list cannot act differently on "offline" versus "malformed JSON".
 */
const fetchIndex = () =>
	gen(async function* () {
		const response = yield* await tryPromise(
			() => fetch(`${UPSTREAM}/themes.json`),
			() => communityErrors.unavailable(),
		);
		if (!response.ok) return yield* err(communityErrors.unavailable());
		const payload = yield* await tryPromise(
			() => response.json() as Promise<unknown>,
			() => communityErrors.unavailable(),
		);
		return themeIndexEntries(payload);
	});

const communityList = server.implement(communityListContract).handler(async () => {
	const index = await fetchIndex();
	if (!index.ok) return err(index.error);
	return ok(index.value);
});

const communityBySlug = server
	.implement(communityBySlugContract)
	.handler(async ({ input, errors }) => {
		const index = await fetchIndex();
		if (!index.ok) return err(index.error);

		const meta = index.value.find((entry) => entry.slug === input.slug);
		if (!meta) return err(errors.notFound({ slug: input.slug }));

		const config = await tryPromise(
			async () => {
				const response = await fetch(`${UPSTREAM}/${meta.file}`);
				if (!response.ok) throw new Error(`upstream ${response.status}`);
				return response.text();
			},
			() => errors.unavailable(),
		);
		if (!config.ok) return err(config.error);

		// Merged over the default so all 21 colours are always present.
		return ok({
			meta,
			colors: { ...defaultThemeColors, ...parseThemeConfig(config.value).colors },
		});
	});

export const router = server.router({
	session: SessionLayer.implement(server, sessionContract, session),
	viewer: ViewerLayer.implement(server, viewerContract, requireViewer),
	themes: { published, mine, byId, create, update, togglePublish, fork, remove },
	community: { list: communityList, bySlug: communityBySlug },
});

export const createContext = (): AppContext => ({ db });

/**
 * In-process caller for server routes that are not the RPC endpoint — OG image
 * generation and SEO head resolution. It keeps everything that decides whether
 * a call is correct (middleware, validation, codecs, private-error
 * sanitization) and drops only the transport, so these callers get the same
 * visibility rules as the browser rather than a second, divergent query.
 */
export const kittyServerClient = () => createServerClient(router, { context: createContext() });

/**
 * Mounted at POST /api/rpc by src/routes/api.rpc.ts. The library default is
 * `/rpc` and Start's server routes live under `/api`, so both ends are set
 * explicitly — here, and on `fetchTransport({ url })` in rpc-client.ts.
 */
export const rpcHandler = createFetchHandler({
	router,
	createContext,
	endpoint: "/api/rpc",
	onInternalError: ({ incidentId, procedurePath, cause }) => {
		// oxlint-disable-next-line no-console -- defects belong in the Worker log.
		console.error("[rpc]", incidentId, procedurePath, cause);
	},
});
