/**
 * The one contract, and therefore the one digest and the one browser client.
 *
 * result-rpc registers its client globally (`declare module "result-rpc/react"`
 * in ./client), so a second client would have nowhere to live — which settles
 * the question of whether kitty and the blog admin get separate routers. They
 * do not. They keep separate namespaces under one root, each mounted at the top
 * level, so a call reads `client.themes.byId` or `client.posts.list`.
 *
 * BROWSER-SAFE.
 */
import {
	categoriesContract,
	checkLinksContract,
	cliContract,
	commentsContract,
	notesContract,
	postsContract,
	statsOverviewContract,
} from "@/src/blog/contract";
import { communityContract, themesContract } from "@/src/kitty/contract";
import { app } from "./app";
import { AdminLayer, SessionLayer, ViewerLayer } from "./auth";

/**
 * The layers' context procedures. Their handlers are derived from the same
 * declaration as the server middleware, so the endpoint cannot disagree with
 * the middleware about either the value or its union.
 */
export const sessionContract = SessionLayer.contract(app);
export const viewerContract = ViewerLayer.contract(app);
export const adminContract = AdminLayer.contract(app);

export const appContract = app.contract({
	session: sessionContract,
	viewer: viewerContract,
	admin: adminContract,
	themes: themesContract,
	community: communityContract,
	posts: postsContract,
	categories: categoriesContract,
	notes: notesContract,
	comments: commentsContract,
	links: { check: checkLinksContract },
	stats: { overview: statsOverviewContract },
	cli: cliContract,
});

export type AppContract = typeof appContract;
