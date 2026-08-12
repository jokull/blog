/**
 * The posts table.
 *
 * The publish switch and the category select are optimistic, patching the `post`
 * entity by slug so every cached view of that row moves at once. Nothing here
 * depends on a page-level revalidation to show the result of a write.
 */
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Link } from "@/src/lib/navigation";
import { client } from "@/src/rpc/client";
import { Temporal } from "temporal-polyfill";
import { PostModel, type PostRowValue, type SavedCategory } from "../models";
import { AdminShell } from "../shells";

interface PostsTableProps {
	posts: readonly PostRowValue[];
	categories: readonly SavedCategory[];
	pageviewsBySlug: Readonly<Record<string, number>>;
}

export function PostsTable({ posts, categories, pageviewsBySlug }: PostsTableProps) {
	return (
		<div className="w-full overflow-x-auto">
			<Table aria-label="Blog posts">
				<TableHeader>
					<TableColumn isRowHeader>Title</TableColumn>
					<TableColumn>7d Views</TableColumn>
					<TableColumn>Published</TableColumn>
					<TableColumn>Language</TableColumn>
					<TableColumn>Category</TableColumn>
					<TableColumn>Published Date</TableColumn>
					<TableColumn>Modified Date</TableColumn>
				</TableHeader>
				<TableBody>
					{posts.map((post) => (
						<PostRow
							key={post.slug}
							post={post}
							categories={categories}
							pageviews={pageviewsBySlug[post.slug] ?? 0}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

const formatDate = (date: Date | null) =>
	date === null
		? "—"
		: date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });

function PostRow({
	post,
	categories,
	pageviews,
}: {
	post: PostRowValue;
	categories: readonly SavedCategory[];
	pageviews: number;
}) {
	/**
	 * Absolute, not a toggle. The switch knows the state it wants, so a double
	 * click cannot land as an unpublish — and this is the same procedure
	 * `blog update --publish` calls, so the two cannot disagree about what
	 * publishing does.
	 */
	const setPublished = AdminShell.useMutation(client.posts.setPublished, {
		optimistic: (input, cache) => ({
			rollback: cache.updateEntity(PostModel, input.slug, () => ({
				publicAt: input.published ? Temporal.Now.plainDateISO() : null,
			})),
		}),
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	const setCategory = AdminShell.useMutation(client.posts.update, {
		optimistic: (input, cache) => ({
			rollback: cache.updateEntity(PostModel, input.slug, () => ({
				categorySlug: input.categorySlug ?? null,
			})),
		}),
		onFailure: (_error, _input, context) => context?.rollback(),
		onCancel: (_input, context) => context?.rollback(),
	});

	const isPending = setPublished.state === "pending" || setCategory.state === "pending";

	return (
		<TableRow className={isPending ? "opacity-50" : ""}>
			<TableCell>
				{/* Links to the post itself; bodies are edited with `blog edit
				    <slug>`, which opens $EDITOR. */}
				<Link
					href={`/${post.slug}`}
					className="text-blue-600 hover:underline dark:text-blue-400"
				>
					{post.title}
				</Link>
			</TableCell>

			<TableCell>
				<span className="text-neutral-500 text-sm tabular-nums">
					{pageviews > 0 ? pageviews.toLocaleString() : "—"}
				</span>
			</TableCell>

			<TableCell>
				<Switch
					isSelected={post.publicAt !== null}
					onChange={(published) => {
						setPublished.mutate({ slug: post.slug, published });
					}}
					isDisabled={isPending}
				/>
			</TableCell>

			<TableCell>
				<span className="text-sm uppercase">{post.locale}</span>
			</TableCell>

			<TableCell>
				<Select
					selectedKey={post.categorySlug ?? "none"}
					onSelectionChange={(key) => {
						const next = String(key);
						setCategory.mutate({
							slug: post.slug,
							expectedRevision: post.revision,
							categorySlug: next === "none" ? null : next,
						});
					}}
					isDisabled={isPending}
				>
					<SelectTrigger />
					<SelectContent>
						<SelectItem id="none">No Category</SelectItem>
						{categories.map((category) => (
							<SelectItem key={category.slug} id={category.slug}>
								{category.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>

			<TableCell>
				<time className="text-sm tabular-nums">{formatDate(post.publishedAt)}</time>
			</TableCell>

			<TableCell>
				<time className="text-sm tabular-nums">{formatDate(post.modifiedAt)}</time>
			</TableCell>
		</TableRow>
	);
}
