"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectItem, SelectTrigger, SelectContent } from "@/components/ui/select";
import type { InferSelectModel } from "drizzle-orm";
import type { Post } from "@/schema";
import { Link } from "@/src/lib/navigation";
import { togglePostPublished, updatePostCategory } from "../actions";
import { useTransition } from "react";

interface PostTableRowProps {
	post: InferSelectModel<typeof Post>;
	categories: Array<{ slug: string; label: string }>;
	pageviews: number;
}

export function PostTableRow({ post, categories, pageviews }: PostTableRowProps) {
	const [isPending, startTransition] = useTransition();

	const handleTogglePublished = (isSelected: boolean) => {
		startTransition(async () => {
			await togglePostPublished({ data: { slug: post.slug } });
		});
	};

	const handleCategoryChange = (categorySlug: string) => {
		startTransition(async () => {
			await updatePostCategory({
				data: {
					slug: post.slug,
					categorySlug: categorySlug === "none" ? null : categorySlug,
				},
			});
		});
	};

	return (
		<TableRow className={isPending ? "opacity-50" : ""}>
			<TableCell>
				<Link
					href={`/${post.slug}/editor`}
					className="text-blue-600 hover:underline dark:text-blue-400"
				>
					{post.title}
				</Link>
			</TableCell>

			<TableCell>
				<span className="tabular-nums text-sm text-neutral-500">
					{pageviews > 0 ? pageviews.toLocaleString() : "—"}
				</span>
			</TableCell>

			<TableCell>
				<Switch
					isSelected={post.publicAt !== null}
					onChange={handleTogglePublished}
					isDisabled={isPending}
				/>
			</TableCell>

			<TableCell>
				<span className="uppercase text-sm">{post.locale}</span>
			</TableCell>

			<TableCell>
				<Select
					selectedKey={post.categorySlug ?? "none"}
					onSelectionChange={(key) => {
						handleCategoryChange(String(key));
					}}
					isDisabled={isPending}
				>
					<SelectTrigger />
					<SelectContent>
						<SelectItem id="none">No Category</SelectItem>
						{categories.map((cat) => (
							<SelectItem key={cat.slug} id={cat.slug}>
								{cat.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>

			<TableCell>
				<time className="text-sm tabular-nums">
					{post.publishedAt.toLocaleDateString("en", {
						year: "numeric",
						month: "short",
						day: "numeric",
					})}
				</time>
			</TableCell>

			<TableCell>
				<time className="text-sm tabular-nums">
					{post.modifiedAt
						? post.modifiedAt.toLocaleDateString("en", {
								year: "numeric",
								month: "short",
								day: "numeric",
							})
						: "—"}
				</time>
			</TableCell>
		</TableRow>
	);
}
