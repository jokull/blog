import { createServerFn } from "@tanstack/react-start";

export const createComment = createServerFn({ method: "POST" })
	.validator((data: { postSlug: string; content: string }) => data)
	.handler(async ({ data }) => {
		const [{ getGithubUser, getSession }, { db }, { Comment }, { revalidatePath }] =
			await Promise.all([
				import("@/auth"),
				import("@/db"),
				import("@/schema"),
				import("@/src/lib/revalidate"),
			]);
		const session = await getSession();
		if (!session.githubUsername) {
			throw new Error("Please sign in to comment");
		}

		if (!data.content || typeof data.content !== "string") {
			throw new Error("Content is required");
		}

		// Get GitHub user info
		const githubUser = await getGithubUser(session.githubUsername);

		const comment = await db
			.insert(Comment)
			.values({
				postSlug: data.postSlug,
				authorGithubId: githubUser.id,
				authorGithubUsername: githubUser.login,
				authorAvatarUrl: githubUser.avatar_url,
				content: data.content.trim(),
			})
			.returning();

		revalidatePath(`/${data.postSlug}`);
		return comment[0];
	});

export const updateComment = createServerFn({ method: "POST" })
	.validator((data: { commentId: number; content: string }) => data)
	.handler(async ({ data }) => {
		const [{ getSession, isAdmin }, { db }, { Comment }, { eq }, { revalidatePath }] =
			await Promise.all([
				import("@/auth"),
				import("@/db"),
				import("@/schema"),
				import("drizzle-orm"),
				import("@/src/lib/revalidate"),
			]);
		const session = await getSession();
		if (!session.githubUsername) {
			throw new Error("Please sign in to edit comments");
		}

		if (!data.content || typeof data.content !== "string") {
			throw new Error("Content is required");
		}

		// Get the comment to verify ownership
		const existingComment = await db.query.Comment.findFirst({
			where: { id: data.commentId },
		});

		if (!existingComment) {
			throw new Error("Comment not found");
		}

		// Check if user is the author or admin
		const isCommentAuthor = existingComment.authorGithubUsername === session.githubUsername;
		const isAdminUser = await isAdmin();

		if (!isCommentAuthor && !isAdminUser) {
			throw new Error("You can only edit your own comments");
		}

		const updatedComment = await db
			.update(Comment)
			.set({ content: data.content.trim() })
			.where(eq(Comment.id, data.commentId))
			.returning();

		// Revalidate the post page
		const postSlug = updatedComment[0].postSlug;
		revalidatePath(`/${postSlug}`);

		return updatedComment[0];
	});

export const toggleCommentHidden = createServerFn({ method: "POST" })
	.validator((data: { commentId: number; isHidden: boolean }) => data)
	.handler(async ({ data }) => {
		const [{ isAdmin }, { db }, { Comment }, { eq }, { revalidatePath }] = await Promise.all([
			import("@/auth"),
			import("@/db"),
			import("@/schema"),
			import("drizzle-orm"),
			import("@/src/lib/revalidate"),
		]);
		const adminCheck = await isAdmin();
		if (!adminCheck) {
			throw new Error("Admin access required");
		}

		const updatedComment = await db
			.update(Comment)
			.set({ isHidden: data.isHidden })
			.where(eq(Comment.id, data.commentId))
			.returning();

		if (updatedComment.length === 0) {
			throw new Error("Comment not found");
		}

		// Revalidate the post page
		const postSlug = updatedComment[0].postSlug;
		revalidatePath(`/${postSlug}`);

		return updatedComment[0];
	});

export const deleteComment = createServerFn({ method: "POST" })
	.validator((data: { commentId: number }) => data)
	.handler(async ({ data }) => {
		const [{ getSession, isAdmin }, { db }, { Comment }, { eq }, { revalidatePath }] =
			await Promise.all([
				import("@/auth"),
				import("@/db"),
				import("@/schema"),
				import("drizzle-orm"),
				import("@/src/lib/revalidate"),
			]);
		const session = await getSession();
		if (!session.githubUsername) {
			throw new Error("Please sign in to delete comments");
		}

		// Get the comment to verify ownership
		const existingComment = await db.query.Comment.findFirst({
			where: { id: data.commentId },
		});

		if (!existingComment) {
			throw new Error("Comment not found");
		}

		// Check if user is the author or admin
		const isCommentAuthor = existingComment.authorGithubUsername === session.githubUsername;
		const isAdminUser = await isAdmin();

		if (!isCommentAuthor && !isAdminUser) {
			throw new Error("You can only delete your own comments");
		}

		const deletedComment = await db
			.delete(Comment)
			.where(eq(Comment.id, data.commentId))
			.returning();

		if (deletedComment.length === 0) {
			throw new Error("Comment not found");
		}

		// Revalidate the post page
		const postSlug = deletedComment[0].postSlug;
		revalidatePath(`/${postSlug}`);

		return deletedComment[0];
	});
