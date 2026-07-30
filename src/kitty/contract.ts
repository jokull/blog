/**
 * The shared contract: the ONLY result-rpc surface browser code may import.
 *
 * It carries codecs, error definitions and invalidation maps — no handlers, no
 * Drizzle driver, no session secret. `AppContext` comes in type-only from the
 * server half and is erased at build. Importing `rpc-server.ts` from anything
 * the browser bundles would ship the D1 binding and every handler closure;
 * bundlers do not tree-shake that away.
 */
import { pickErrors, rpc, wire } from "result-rpc";
import { authErrors, communityErrors, themeErrors } from "./errors";
import { SessionLayer, ViewerLayer } from "./layers";
import {
	CommunityThemeCodec,
	CommunityThemeDetailCodec,
	KittyThemeView,
	ThemeColorsCodec,
} from "./models";
import type { AppContext } from "./rpc-server";

export const app = rpc.context<AppContext>();

/**
 * The layers' context procedures. Their handlers are derived from the same
 * declaration as the server middleware, so the endpoint cannot disagree with
 * the middleware about either the value or its union.
 */
export const sessionContract = SessionLayer.contract(app);
export const viewerContract = ViewerLayer.contract(app);

/** Everything published, for the sidebar's Published tab. Public. */
export const publishedThemesContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.array(KittyThemeView))
	.query();

/** The signed-in user's own themes, drafts included. */
export const myThemesContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.array(KittyThemeView))
	.errors(authErrors)
	.query();

/**
 * A single theme. Unpublished themes are `theme/not-found` to anyone who is
 * neither the owner nor an admin — the same answer the old code gave by
 * returning `null`, but now it is a declared outcome rather than an absence.
 */
export const themeByIdContract = app
	.procedure()
	.input(wire.object({ id: wire.number }))
	.output(KittyThemeView)
	.errors(pickErrors(themeErrors, "notFound"))
	.query();

const themeDraftInput = {
	name: wire.string,
	blurb: wire.union([wire.string, wire.null]),
	colors: ThemeColorsCodec,
};

/**
 * Returns the entity, so the new row patches into any cached list that already
 * holds it. Membership is the part identity cannot express, so the two list
 * queries ride `.affects()`.
 */
export const createThemeContract = app
	.procedure()
	.input(wire.object(themeDraftInput))
	.output(KittyThemeView)
	.errors(authErrors)
	.affects(myThemesContract)
	.mutation();

export const updateThemeContract = app
	.procedure()
	.input(wire.object({ id: wire.number, ...themeDraftInput }))
	.output(KittyThemeView)
	.errors({ ...authErrors, ...pickErrors(themeErrors, "notFound", "notOwner") })
	.mutation();

/** Publishing changes list membership, so the published list is invalidated. */
export const togglePublishContract = app
	.procedure()
	.input(wire.object({ id: wire.number }))
	.output(KittyThemeView)
	.errors({ ...authErrors, ...pickErrors(themeErrors, "notFound", "notOwner") })
	.affects(publishedThemesContract)
	.mutation();

export const forkThemeContract = app
	.procedure()
	.input(wire.object({ id: wire.number }))
	.output(KittyThemeView)
	.errors({
		...authErrors,
		...pickErrors(themeErrors, "notFound", "forkUnpublished"),
	})
	.affects(myThemesContract)
	.mutation();

/**
 * A deleted row cannot be returned as an entity, so the handler calls
 * `touch(KittyThemeModel, id)` to invalidate it by identity instead.
 */
export const deleteThemeContract = app
	.procedure()
	.input(wire.object({ id: wire.number }))
	.output(wire.object({ id: wire.number }))
	.errors({ ...authErrors, ...pickErrors(themeErrors, "notFound", "notOwner") })
	.affects(publishedThemesContract)
	.affects(myThemesContract)
	.mutation();

/** The upstream kovidgoyal/kitty-themes index. */
export const communityListContract = app
	.procedure()
	.input(wire.object({}))
	.output(wire.array(CommunityThemeCodec))
	.errors(pickErrors(communityErrors, "unavailable"))
	.query();

export const communityBySlugContract = app
	.procedure()
	.input(wire.object({ slug: wire.string }))
	.output(CommunityThemeDetailCodec)
	.errors(communityErrors)
	.query();

export const kittyContract = app.contract({
	session: sessionContract,
	viewer: viewerContract,
	themes: {
		published: publishedThemesContract,
		mine: myThemesContract,
		byId: themeByIdContract,
		create: createThemeContract,
		update: updateThemeContract,
		togglePublish: togglePublishContract,
		fork: forkThemeContract,
		remove: deleteThemeContract,
	},
	community: {
		list: communityListContract,
		bySlug: communityBySlugContract,
	},
});
