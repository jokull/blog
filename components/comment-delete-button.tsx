"use client";

import { useTransition } from "react";
import { deleteComment } from "@/lib/comment-actions";

interface CommentDeleteButtonProps {
	commentId: number;
}

export function CommentDeleteButton({ commentId }: CommentDeleteButtonProps) {
	const [isPending, startTransition] = useTransition();

	function handleDelete() {
		if (
			window.confirm(
				"Are you sure you want to delete this comment? This action cannot be undone.",
			)
		) {
			startTransition(async () => {
				await deleteComment({ data: { commentId } });
			});
		}
	}

	return (
		<button
			type="button"
			onClick={handleDelete}
			disabled={isPending}
			className="text-primary hover:text-danger hover:underline disabled:opacity-50"
		>
			{isPending ? "..." : "Delete"}
		</button>
	);
}
