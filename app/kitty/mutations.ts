import { createServerFn } from "@tanstack/react-start";
import type { KittyTheme as KittyThemeType } from "./_lib/types";

function generateSlug(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") +
		"-" +
		Date.now().toString(36)
	);
}

async function deps() {
	const [
		{ requireAuth, getSession, isAdmin, getGithubUser },
		{ db },
		{ KittyTheme },
		{ eq },
		{ revalidatePath },
	] = await Promise.all([
		import("@/auth"),
		import("@/db"),
		import("@/schema"),
		import("drizzle-orm"),
		import("@/src/lib/revalidate"),
	]);
	return { requireAuth, getSession, isAdmin, getGithubUser, db, KittyTheme, eq, revalidatePath };
}

export const createTheme = createServerFn({ method: "POST" })
	.validator((data: { name: string; colors: KittyThemeType["colors"]; blurb?: string }) => data)
	.handler(async ({ data }) => {
		const { requireAuth, getSession, getGithubUser, db, KittyTheme, revalidatePath } =
			await deps();
		await requireAuth();
		const session = await getSession();
		const githubUser = await getGithubUser(session.githubUsername!);
		const theme = await db
			.insert(KittyTheme)
			.values({
				slug: generateSlug(data.name),
				name: data.name,
				blurb: data.blurb ?? null,
				colors: data.colors,
				authorGithubId: githubUser.id,
				authorGithubUsername: githubUser.login,
				authorAvatarUrl: githubUser.avatar_url,
				isPublished: false,
			})
			.returning();
		revalidatePath("/kitty");
		return {
			...theme[0],
			blurb: theme[0].blurb ?? null,
			colors: theme[0].colors,
		} as KittyThemeType;
	});

export const updateTheme = createServerFn({ method: "POST" })
	.validator(
		(data: {
			id: number;
			updates: Partial<{
				name: string;
				blurb: string | null;
				colors: KittyThemeType["colors"];
			}>;
		}) => data,
	)
	.handler(async ({ data }) => {
		const { getSession, isAdmin, db, KittyTheme, eq, revalidatePath } = await deps();
		const session = await getSession();
		if (!session.githubUsername) throw new Error("Auth required");
		const theme = await db.query.KittyTheme.findFirst({ where: { id: data.id } });
		if (!theme) throw new Error("Theme not found");
		const isOwner = theme.authorGithubUsername === session.githubUsername;
		if (!isOwner && !(await isAdmin())) throw new Error("Unauthorized");
		const updated = await db
			.update(KittyTheme)
			.set({ ...data.updates, colors: data.updates.colors, modifiedAt: new Date() })
			.where(eq(KittyTheme.id, data.id))
			.returning();
		revalidatePath("/kitty");
		return {
			...updated[0],
			blurb: updated[0].blurb ?? null,
			colors: updated[0].colors,
		} as KittyThemeType;
	});

export const togglePublish = createServerFn({ method: "POST" })
	.validator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		const { getSession, isAdmin, db, KittyTheme, eq, revalidatePath } = await deps();
		const session = await getSession();
		if (!session.githubUsername) throw new Error("Auth required");
		const theme = await db.query.KittyTheme.findFirst({ where: { id: data.id } });
		if (!theme) throw new Error("Theme not found");
		const isOwner = theme.authorGithubUsername === session.githubUsername;
		if (!isOwner && !(await isAdmin())) throw new Error("Unauthorized");
		const updated = await db
			.update(KittyTheme)
			.set({ isPublished: !theme.isPublished, modifiedAt: new Date() })
			.where(eq(KittyTheme.id, data.id))
			.returning();
		revalidatePath("/kitty");
		return {
			...updated[0],
			blurb: updated[0].blurb ?? null,
			colors: updated[0].colors,
		} as KittyThemeType;
	});

export const forkTheme = createServerFn({ method: "POST" })
	.validator((data: { originalId: number }) => data)
	.handler(async ({ data }) => {
		const { requireAuth, getSession, getGithubUser, db, KittyTheme, revalidatePath } =
			await deps();
		await requireAuth();
		const session = await getSession();
		const original = await db.query.KittyTheme.findFirst({
			where: { id: data.originalId },
		});
		if (!original) throw new Error("Theme not found");
		if (!original.isPublished) throw new Error("Cannot fork unpublished theme");
		const githubUser = await getGithubUser(session.githubUsername!);
		const forked = await db
			.insert(KittyTheme)
			.values({
				slug: generateSlug(`${original.name} remix`),
				name: `${original.name} (Remix)`,
				blurb: original.blurb ?? null,
				colors: original.colors,
				authorGithubId: githubUser.id,
				authorGithubUsername: githubUser.login,
				authorAvatarUrl: githubUser.avatar_url,
				forkedFromId: original.id,
				isPublished: false,
			})
			.returning();
		revalidatePath("/kitty");
		return {
			...forked[0],
			blurb: forked[0].blurb ?? null,
			colors: forked[0].colors,
		} as KittyThemeType;
	});

export const deleteTheme = createServerFn({ method: "POST" })
	.validator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		const { getSession, isAdmin, db, KittyTheme, eq, revalidatePath } = await deps();
		const session = await getSession();
		if (!session.githubUsername) throw new Error("Auth required");
		const theme = await db.query.KittyTheme.findFirst({ where: { id: data.id } });
		if (!theme) throw new Error("Theme not found");
		const isOwner = theme.authorGithubUsername === session.githubUsername;
		if (!isOwner && !(await isAdmin())) throw new Error("Unauthorized");
		await db.delete(KittyTheme).where(eq(KittyTheme.id, data.id));
		revalidatePath("/kitty");
	});

export const getForkedFromTheme = createServerFn({ method: "GET" })
	.validator((data: { forkedFromId: number }) => data)
	.handler(async ({ data }): Promise<KittyThemeType | null> => {
		const { db } = await deps();
		const theme = await db.query.KittyTheme.findFirst({
			where: { id: data.forkedFromId },
		});
		if (!theme) return null;
		return { ...theme, blurb: theme.blurb ?? null, colors: theme.colors } as KittyThemeType;
	});
