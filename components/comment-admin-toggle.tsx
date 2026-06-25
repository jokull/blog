"use client";

import { useTransition } from "react";
import { toggleCommentHidden } from "@/lib/comment-actions";

interface CommentAdminToggleProps {
	commentId: number;
	isHidden: boolean;
}

export function CommentAdminToggle({ commentId, isHidden }: CommentAdminToggleProps) {
	const [isPending, startTransition] = useTransition();

	function handleToggle() {
		startTransition(async () => {
			await toggleCommentHidden({ data: { commentId, isHidden: !isHidden } });
		});
	}

	return (
		<button
			type="button"
			onClick={handleToggle}
			disabled={isPending}
			className="text-primary hover:text-primary/80 hover:underline disabled:opacity-50"
		>
			{isPending ? "..." : isHidden ? "Show" : "Hide"}
		</button>
	);
}
