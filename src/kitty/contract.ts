/**
 * The kitty half of the contract: the ONLY result-rpc surface browser code may
 * import for the theme browser.
 *
 * It carries codecs, error definitions and invalidation maps — no handlers, no
 * Drizzle driver, no session secret. Importing `rpc-server.ts` from anything
 * the browser bundles would ship the D1 binding and every handler closure;
 * bundlers do not tree-shake that away.
 *
 * These procedures are composed into the app-wide contract by src/rpc/contract.
 */
import { pickErrors, wire } from "result-rpc";
import { app } from "@/src/rpc/app";
import { signInErrors } from "@/src/rpc/auth";
import { communityErrors, themeErrors } from "./errors";
import {
	CommunityThemeCodec,
	CommunityThemeDetailCodec,
	KittyThemeView,
	ThemeColorsCodec,
} from "./models";
import { ThemeBlurbSchema, ThemeNameSchema } from "./schemas";

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
	.errors(signInErrors)
	.query();

/**
 * A single theme. Unpublished themes are `theme/not-found` to anyone who is
 * neither the owner nor an admin — a declared outcome rather than an absence,
 * and one that does not disclose that the row exists.
 */
export const themeByIdContract = app
	.procedure()
	.input(wire.object({ id: wire.number }))
	.output(KittyThemeView)
	.errors(pickErrors(themeErrors, "notFound"))
	.query();

/**
 * The metadata fields adopt the same Valibot schemas the form runs, via
 * `wire.standard`. So "a theme must have a name" is declared once and enforced
 * at both boundaries, rather than only in the form — a bare `wire.string` would
 * accept `""` from anything that skipped it.
 *
 * The stable `id`s participate in the contract digest: bump them whenever the
 * accepted shape or semantics change, so skewed clients are detected.
 */
const themeDraftInput = {
	name: wire.standard(ThemeNameSchema, { id: "theme-name/v1" }),
	blurb: wire.nullable(wire.standard(ThemeBlurbSchema, { id: "theme-blurb/v1" })),
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
	.errors({ ...signInErrors, ...pickErrors(themeErrors, "authorUnavailable") })
	.affects(myThemesContract)
	.mutation();

export const updateThemeContract = app
	.procedure()
	.input(wire.object({ id: wire.number, ...themeDraftInput }))
	.output(KittyThemeView)
	.errors({ ...signInErrors, ...pickErrors(themeErrors, "notFound", "notOwner") })
	.mutation();

/** Publishing changes list membership, so the published list is invalidated. */
export const togglePublishContract = app
	.procedure()
	.input(wire.object({ id: wire.number }))
	.output(KittyThemeView)
	.errors({ ...signInErrors, ...pickErrors(themeErrors, "notFound", "notOwner") })
	.affects(publishedThemesContract)
	.mutation();

export const forkThemeContract = app
	.procedure()
	.input(wire.object({ id: wire.number }))
	.output(KittyThemeView)
	.errors({
		...signInErrors,
		...pickErrors(themeErrors, "notFound", "forkUnpublished", "authorUnavailable"),
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
	.errors({ ...signInErrors, ...pickErrors(themeErrors, "notFound", "notOwner") })
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

/**
 * Plain records, not `app.contract(...)`: the root contract is built once in
 * src/rpc/contract.ts so there is exactly one digest and one browser client.
 * Namespace names are kept at the top level (`themes`, `community`) so every
 * existing call site still reads `client.themes.byId`.
 */
export const themesContract = {
	published: publishedThemesContract,
	mine: myThemesContract,
	byId: themeByIdContract,
	create: createThemeContract,
	update: updateThemeContract,
	togglePublish: togglePublishContract,
	fork: forkThemeContract,
	remove: deleteThemeContract,
};

export const communityContract = {
	list: communityListContract,
	bySlug: communityBySlugContract,
};
