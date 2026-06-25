"use client";

import { useState, useTransition } from "react";
import { createComment } from "@/lib/comment-actions";
import { OctocatIcon } from "./octocat-icon";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface User {
	email: string;
	githubId: number;
	githubUsername: string;
	name: string;
	avatarUrl: string;
}

interface CommentFormProps {
	postSlug: string;
	user: User | null;
}

export function CommentForm({ postSlug, user }: CommentFormProps) {
	const [newComment, setNewComment] = useState("");
	const [isPending, startTransition] = useTransition();

	async function handleSubmit() {
		if (!newComment.trim() || !user || isPending) return;

		startTransition(async () => {
			await createComment({ data: { postSlug, content: newComment } });
			setNewComment("");
		});
	}

	function handleLogin() {
		window.location.href = `/auth/login?next=${encodeURIComponent(window.location.href)}`;
	}

	return (
		<div className="space-y-3">
			<Textarea
				value={newComment}
				onChange={(e) => {
					setNewComment(e.target.value);
				}}
				disabled={!user}
				placeholder={
					user
						? "Markdown with codeblocks and syntax highlighting supported"
						: "Sign in to comment..."
				}
				className="min-h-24"
			/>

			<div className="flex items-center justify-between">
				<div className="text-muted-foreground text-sm">
					{user ? <span>Commenting as @{user.githubUsername}</span> : <span />}
				</div>

				{user ? (
					<Button
						onClick={() => {
							void handleSubmit();
						}}
						isDisabled={!newComment.trim() || isPending}
					>
						{isPending ? "Submitting..." : "Submit"}
					</Button>
				) : (
					<Button
						intent="secondary"
						onClick={handleLogin}
						className="bg-neutral-800 text-neutral-100 hover:bg-neutral-950 hover:text-white"
					>
						<OctocatIcon className="size-5" />
						Sign in with GitHub
					</Button>
				)}
			</div>
		</div>
	);
}
