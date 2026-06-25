"use client";

import { useState, useTransition } from "react";
import { updateComment } from "@/lib/comment-actions";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface CommentEditProps {
	commentId: number;
	initialContent: string;
	onCancel: () => void;
}

export function CommentEdit({ commentId, initialContent, onCancel }: CommentEditProps) {
	const [content, setContent] = useState(initialContent);
	const [isPending, startTransition] = useTransition();

	function handleSubmit() {
		if (!content.trim() || isPending) return;

		startTransition(async () => {
			try {
				await updateComment({ data: { commentId, content } });
				onCancel(); // Close edit mode
			} catch (_error) {}
		});
	}

	return (
		<div className="space-y-3">
			<Textarea
				value={content}
				onChange={(e) => {
					setContent(e.target.value);
				}}
				className="min-h-24"
				placeholder="Edit your comment..."
			/>
			<div className="text-muted-foreground text-xs">
				Markdown with codeblocks and syntax highlighting supported
			</div>
			<div className="flex items-center gap-2">
				<Button
					onClick={handleSubmit}
					isDisabled={!content.trim() || isPending}
					intent="outline"
					size="sm"
				>
					{isPending ? "Saving..." : "Save"}
				</Button>
				<Button onClick={onCancel} intent="outline" size="sm">
					Cancel
				</Button>
			</div>
		</div>
	);
}
