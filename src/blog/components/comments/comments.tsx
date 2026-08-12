"use client";

/**
 * The comment thread — an island on an otherwise server-rendered article.
 *
 * The post page is an RSC route; only this subtree is a result-rpc client
 * tree. React context reaches it through the RSC payload, so the client and the
 * boundary shells from `__root.tsx` are already in scope here — the thread
 * shares the app's one runtime rather than keeping a cache of its own, and adds
 * only the identity layers it needs:
 *
 *   SessionShell   provides `viewer: Viewer | null`
 *     SignInShell  claims `auth/required` — the composer shows a GitHub CTA
 *                  in place of the box when signed out, and the shell still
 *                  guards every mutation beneath it
 *       AdminShell claims `auth/forbidden` — moderation controls only ever
 *                  render for the admin, so this is belt-and-braces
 *
 * The `"use client"` directive is load-bearing: this module is imported by an
 * RSC page, and it is the boundary that puts everything below it — the shells,
 * Motion, Formisch — in the client graph. Without it the RSC build tries to
 * evaluate framer-motion's internals on the server and fails.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DehydratedQueryRuntime } from "result-rpc/query";
import { ResultRpcHydrationBoundary } from "result-rpc/react";
import { client } from "@/src/rpc/client";
import { SessionShell, SignInShell } from "@/src/rpc/shells";
import { AdminShell } from "../../shells";
import { CommentComposer } from "./comment-composer";
import { CommentItem } from "./comment-item";
import { fade } from "./motion";

export function Comments({
	postSlug,
	cache,
}: {
	postSlug: string;
	/** Dehydrated by the server page; `undefined` starts the thread cold. */
	cache?: DehydratedQueryRuntime;
}) {
	return (
		<ResultRpcHydrationBoundary state={cache}>
			<SessionShell.Provider>
				<SignInShell.Provider>
					<AdminShell.Provider>
						<Thread postSlug={postSlug} />
					</AdminShell.Provider>
				</SignInShell.Provider>
			</SessionShell.Provider>
		</ResultRpcHydrationBoundary>
	);
}

function Thread({ postSlug }: { postSlug: string }) {
	const reduceMotion = useReducedMotion();
	const comments = AdminShell.useQuery(client.comments.list, { postSlug });

	// Every failure below this point is claimed by a shell, so the only states
	// left are "still loading" and "here they are".
	const rows = comments.state === "success" ? comments.value : [];

	return (
		<div className="space-y-6">
			<h3 className="font-medium text-lg">
				Comments{" "}
				<motion.span
					key={rows.length}
					initial={reduceMotion ? false : { opacity: 0.4 }}
					animate={{ opacity: 1 }}
					transition={fade}
					className="text-neutral-400 tabular-nums"
				>
					{rows.length}
				</motion.span>
			</h3>

			<ul className="space-y-6">
				{/*
				 * `AnimatePresence` needs the exiting element to stay mounted for
				 * one beat, which is why the rows are keyed by id and the list is
				 * a plain <ul> rather than a fragment: an optimistic row's
				 * negative id is stable until the server's row replaces it.
				 */}
				<AnimatePresence initial={false}>
					{rows.map((comment) => (
						<CommentItem key={comment.id} comment={comment} />
					))}
				</AnimatePresence>
			</ul>

			{comments.state === "pending" && rows.length === 0 && (
				<p className="animate-pulse text-muted-fg text-sm">Loading comments…</p>
			)}

			<CommentComposer postSlug={postSlug} />
		</div>
	);
}
