/**
 * One comment.
 *
 * Edit, delete and hide are all optimistic entity patches, so the row responds
 * on the next frame and the server confirms behind it. No page-level
 * revalidation is involved — the entity patch is what updates the view.
 *
 * `comment/not-author` is rendered rather than claimed: unlike "sign in", there
 * is no reaction that fixes it.
 */
import { Field, Form, reset, useForm } from "@formisch/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { client } from "@/src/rpc/client";
import { SessionShell, SignInShell } from "@/src/rpc/shells";
import { CommentModel, type SavedComment } from "../../models";
import { CommentFormSchema, type CommentForm } from "../../schemas";
import { AdminShell } from "../../shells";
import { CommentBody } from "./comment-body";
import { commentRow, fade, springy } from "./motion";

function formatCommentDate(date: Date): string {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const fullDate = date.toLocaleDateString("en", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});

	if (date.toDateString() === today.toDateString()) return `Today, ${fullDate}`;
	if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${fullDate}`;
	return fullDate;
}

export function CommentItem({ comment }: { comment: SavedComment }) {
	const viewer = SessionShell.use();
	const reduceMotion = useReducedMotion();
	const [isEditing, setIsEditing] = useState(false);

	// Negative ids belong to optimistic rows the server has not acknowledged
	// yet. Offering Edit on one would send a mutation for a row that does not
	// exist.
	const isPending = comment.id < 0;
	const canModerate =
		!isPending &&
		viewer !== null &&
		(viewer.username === comment.authorGithubUsername || viewer.isAdmin);

	const remove = SignInShell.useMutation(client.comments.remove, {
		optimistic: (input, cache) => ({
			rollback: cache.update(client.comments.list, { postSlug: input.postSlug }, (current) =>
				current?.filter((row) => row.id !== input.id),
			),
		}),
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	const setHidden = AdminShell.useMutation(client.comments.setHidden, {
		optimistic: (input, cache) => ({
			rollback: cache.updateEntity(CommentModel, input.id, () => ({
				isHidden: input.hidden,
			})),
		}),
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	return (
		<motion.li
			layout={reduceMotion ? false : "position"}
			variants={commentRow}
			// `false` means "mount at the animate target", which is the reduced-motion
			// answer for both states without needing a second variant name.
			initial={reduceMotion ? false : "initial"}
			animate={isPending ? "pending" : "animate"}
			exit="exit"
			className={`flex list-none items-start gap-3 ${comment.isHidden ? "opacity-50" : ""}`}
		>
			<img
				src={comment.authorAvatarUrl}
				alt={`@${comment.authorGithubUsername}`}
				className="mt-0.5 size-8 rounded-full"
			/>

			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<a
						href={`https://github.com/${comment.authorGithubUsername}`}
						target="_blank"
						rel="noopener noreferrer"
						className="font-medium hover:underline"
					>
						{comment.authorGithubUsername}
					</a>
					<span className="text-muted-fg">{formatCommentDate(comment.createdAt)}</span>

					{isPending && (
						<motion.span
							animate={reduceMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
							transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
							className="text-muted-fg text-xs"
						>
							Posting…
						</motion.span>
					)}

					{canModerate && !isEditing && (
						<>
							<button
								type="button"
								onClick={() => {
									setIsEditing(true);
								}}
								className="text-primary hover:underline"
							>
								Edit
							</button>
							<button
								type="button"
								onClick={() => {
									remove.mutate({
										id: comment.id,
										postSlug: comment.postSlug,
									});
								}}
								className="text-danger hover:underline"
							>
								Delete
							</button>
						</>
					)}

					{viewer?.isAdmin && !isPending && (
						<button
							type="button"
							onClick={() => {
								setHidden.mutate({
									id: comment.id,
									hidden: !comment.isHidden,
								});
							}}
							className="text-muted-fg hover:underline"
						>
							{comment.isHidden ? "Unhide" : "Hide"}
						</button>
					)}
				</div>

				<AnimatePresence mode="wait" initial={false}>
					{isEditing ? (
						<motion.div
							key="edit"
							initial={reduceMotion ? false : { opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={fade}
						>
							<CommentEditor
								comment={comment}
								onDone={() => {
									setIsEditing(false);
								}}
							/>
						</motion.div>
					) : (
						<motion.div
							key="read"
							initial={reduceMotion ? false : { opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={fade}
						>
							<CommentBody content={comment.content} html={comment.contentHtml} />
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence>
					{remove.state === "failure" && (
						<motion.p
							variants={commentRow}
							initial="initial"
							animate="animate"
							exit="exit"
							className="text-danger text-xs"
						>
							{remove.error._tag === "comment/not-author"
								? "That is not your comment."
								: "That comment is already gone."}
						</motion.p>
					)}
				</AnimatePresence>
			</div>
		</motion.li>
	);
}

function CommentEditor({ comment, onDone }: { comment: SavedComment; onDone: () => void }) {
	const reduceMotion = useReducedMotion();
	const form = useForm({
		schema: CommentFormSchema,
		initialInput: { content: comment.content },
	});

	const update = SignInShell.useMutation(client.comments.update, {
		optimistic: (input, cache) => ({
			rollback: cache.updateEntity(CommentModel, input.id, () => ({
				content: input.content,
				// The rendered copy belongs to the *old* markdown, and only the
				// server can produce a new one. Dropping it falls the row back to
				// plain text for the round trip rather than showing text the author
				// just replaced.
				contentHtml: null,
			})),
		}),
		onSuccess: () => {
			onDone();
		},
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	const handleSubmit = ({ content }: CommentForm) => {
		update.mutate({ id: comment.id, content });
	};

	return (
		<Form of={form} onSubmit={handleSubmit} className="space-y-2">
			<Field of={form} path={["content"]}>
				{(field) => (
					<div>
						<Textarea {...field.props} value={field.input ?? ""} className="min-h-20" />
						{field.errors && (
							<motion.p
								initial={reduceMotion ? false : { opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								transition={springy}
								className="mt-1 text-danger text-xs"
							>
								{field.errors[0]}
							</motion.p>
						)}
					</div>
				)}
			</Field>

			<div className="flex items-center gap-2">
				<Button type="submit" size="sm" isDisabled={update.state === "pending"}>
					{update.state === "pending" ? "Saving…" : "Save"}
				</Button>
				<Button
					type="button"
					intent="plain"
					size="sm"
					onPress={() => {
						reset(form);
						onDone();
					}}
				>
					Cancel
				</Button>
				{update.state === "failure" && (
					<span className="text-danger text-xs">
						{update.error._tag === "comment/not-author"
							? "That is not your comment."
							: "That comment is already gone."}
					</span>
				)}
			</div>
		</Form>
	);
}
