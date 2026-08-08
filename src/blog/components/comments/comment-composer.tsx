/**
 * The composer.
 *
 *   - `CommentContentSchema` runs in the textarea and on the wire, one
 *     declaration for both, so the message under the field is the message the
 *     wire would have produced.
 *   - Posting is optimistic. The comment appears in the thread on the next
 *     frame, and `onFailure` puts it back in the textarea rather than losing it.
 *   - Signing in is not this component's job. `SignInShell` claims
 *     `auth/required`, so a signed-out reader can type and press Post; the
 *     shell intercepts and sends them to GitHub. The tag is subtracted from
 *     this mutation's union, so there is no branch here for it at all.
 */
import { Field, Form, reset, useForm } from "@formisch/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OctocatIcon } from "@/components/octocat-icon";
import { client } from "@/src/rpc/client";
import { commentErrors } from "@/src/blog/errors";
import { SessionShell, SignInShell } from "@/src/rpc/shells";
import { CommentFormSchema, type CommentForm } from "../../schemas";
import { CONFIRMATION_MS, confirmation, springy } from "./motion";

/**
 * Optimistic rows need an id before the server has assigned one. Real ids are
 * positive autoincrements, so counting down from zero cannot collide, and the
 * sign is a legible "not saved yet" marker for anything that has to tell.
 */
let pendingId = 0;

export function CommentComposer({ postSlug }: { postSlug: string }) {
	const viewer = SessionShell.use();
	const reduceMotion = useReducedMotion();
	const [justPosted, setJustPosted] = useState(false);

	const form = useForm({ schema: CommentFormSchema, initialInput: { content: "" } });

	const create = SignInShell.useMutation(client.comments.create, {
		optimistic: (input, cache) => {
			if (!viewer) return undefined;

			const placeholder = {
				id: (pendingId -= 1),
				postSlug: input.postSlug,
				authorGithubId: 0,
				authorGithubUsername: viewer.username,
				authorAvatarUrl: `https://github.com/${viewer.username}.png`,
				content: input.content,
				// Rendered on the server; the placeholder shows plain text until the
				// real row arrives. See `comment-body.tsx`.
				contentHtml: null,
				isHidden: false,
				createdAt: new Date(),
			};

			return {
				content: input.content,
				rollback: cache.update(
					client.comments.list,
					{ postSlug: input.postSlug },
					(current) => [...(current ?? []), placeholder],
				),
			};
		},
		onSuccess: () => {
			reset(form);
			setJustPosted(true);
		},
		// The comment goes back in the textarea rather than into the void. The
		// only failures that reach here are `comment/author-unavailable` and
		// `post/not-found` — `auth/required` is claimed by SignInShell above.
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	useEffect(() => {
		if (!justPosted) return;
		const timer = setTimeout(() => {
			setJustPosted(false);
		}, CONFIRMATION_MS);
		return () => {
			clearTimeout(timer);
		};
	}, [justPosted]);

	const handleSubmit = ({ content }: CommentForm) => {
		create.mutate({ postSlug, content });
	};

	const isPending = create.state === "pending";

	return (
		<Form of={form} onSubmit={handleSubmit} className="space-y-3">
			<Field of={form} path={["content"]}>
				{(field) => (
					<div>
						<Textarea
							{...field.props}
							value={field.input ?? ""}
							placeholder={
								viewer
									? "Markdown with codeblocks and syntax highlighting supported"
									: "Write a comment — you'll sign in when you post"
							}
							className="min-h-24"
						/>
						<AnimatePresence>
							{field.errors && (
								<motion.p
									initial={reduceMotion ? false : { opacity: 0, y: -4 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									transition={springy}
									className="mt-1 text-danger text-xs"
								>
									{field.errors[0]}
								</motion.p>
							)}
						</AnimatePresence>
					</div>
				)}
			</Field>

			<div className="flex items-center justify-between gap-3">
				<div className="flex min-h-6 items-center gap-2 text-muted-fg text-sm">
					{viewer ? <span>Commenting as @{viewer.username}</span> : null}

					{/*
					 * The confirmation. Deliberately quiet and deliberately
					 * temporary: the comment appearing in the thread is the real
					 * feedback, and this is only here so the moment of landing is
					 * unambiguous.
					 */}
					<AnimatePresence>
						{justPosted && (
							<motion.span
								key="posted"
								variants={confirmation}
								initial={reduceMotion ? "animate" : "initial"}
								animate="animate"
								exit="exit"
								className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-medium text-success text-xs"
							>
								<svg
									viewBox="0 0 16 16"
									className="size-3"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									aria-hidden
								>
									<path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" />
								</svg>
								Posted
							</motion.span>
						)}
					</AnimatePresence>
				</div>

				<Button type="submit" isDisabled={isPending}>
					{viewer ? (
						isPending ? (
							"Posting…"
						) : (
							"Post"
						)
					) : (
						<>
							<OctocatIcon className="size-5" />
							Sign in &amp; post
						</>
					)}
				</Button>
			</div>

			{create.state === "failure" && (
				<motion.p
					initial={reduceMotion ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-danger text-sm"
				>
					{commentErrors.authorUnavailable.is(create.error)
						? "GitHub is not responding, so your comment could not be attributed. Try again in a moment."
						: "This post no longer exists."}
				</motion.p>
			)}
		</Form>
	);
}
