import { db, decodeNote, decodePost } from "@/db";
import { Link } from "@/src/lib/navigation";
import type { ReactNode } from "react";
import { NoteBody } from "./note-body";
import { PostLink } from "./post-link";

const POST_LIMIT = 12;
const NOTE_LIMIT = 16;
/** The merged feed is capped: everything older lives on /blog and /notes. */
const STREAM_LIMIT = 16;

type StreamItem =
	| {
			kind: "post";
			publicAt: Date;
			slug: string;
			title: string;
			locale: "is" | "en";
			commentCount: number;
	  }
	| { kind: "note"; date: Date; id: string; rendered: ReactNode };

const at = (item: StreamItem): Date => (item.kind === "post" ? item.publicAt : item.date);

export async function RecentStream() {
	const [postsResult, notesResult, commentCountsResult] = await Promise.all([
		db
			.selectFrom("post")
			.selectAll()
			.where("public_at", "is not", null)
			.orderBy("public_at", "desc")
			.limit(POST_LIMIT)
			.execute(),
		db
			.selectFrom("note")
			.selectAll()
			.where("published_at", "is not", null)
			.orderBy("published_at", "desc")
			.limit(NOTE_LIMIT)
			.execute(),
		db
			.selectFrom("comment")
			.select((eb) => ["post_slug", eb.fn.countAll<number>().as("count")])
			.where("is_hidden", "=", 0)
			.groupBy("post_slug")
			.execute(),
	]);

	const posts = postsResult.unwrap().map(decodePost);
	const notes = notesResult.unwrap().map(decodeNote);
	const commentCounts = commentCountsResult.unwrap().reduce(
		(acc, item) => {
			acc[item.post_slug] = item.count;
			return acc;
		},
		{} as Record<string, number>,
	);

	const items: StreamItem[] = [
		...posts.map((post) => {
			// public_at is guaranteed non-null by the SQL filter above; a
			// Temporal.PlainDate is not RSC-serializable, so it degrades to a
			// Date at UTC midnight, exactly like the PostList contract.
			const publicAt = post.publicAt!;
			return {
				kind: "post" as const,
				publicAt: new Date(Date.UTC(publicAt.year, publicAt.month - 1, publicAt.day)),
				slug: post.slug,
				title: post.title,
				locale: post.locale,
				commentCount: commentCounts[post.slug] ?? 0,
			};
		}),
		...notes.flatMap((note) =>
			note.publishedAt
				? [
						{
							kind: "note" as const,
							date: note.publishedAt,
							id: note.id,
							rendered: note.description ? (
								<NoteBody markdown={note.description} />
							) : null,
						},
					]
				: [],
		),
	]
		.sort((a, b) => at(b).getTime() - at(a).getTime())
		.slice(0, STREAM_LIMIT);

	return (
		<>
			<ul className="flex flex-col gap-5">
				{items.map((item) =>
					item.kind === "post" ? (
						<li key={`post-${item.slug}`}>
							<PostLink item={item} commentCount={item.commentCount} showYear />
						</li>
					) : (
						<li key={`note-${item.id}`} className="flex flex-col gap-1">
							{item.rendered}
							<a
								href={`https://x.com/i/status/${item.id}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-stone-400 hover:text-stone-600"
							>
								<time>
									{item.date.toLocaleDateString("en", {
										month: "short",
										day: "numeric",
									})}
								</time>
							</a>
						</li>
					),
				)}
			</ul>
			<div className="mt-8">
				<Link href="/blog" className="text-blue-500 hover:text-blue-600 text-sm">
					all posts →
				</Link>
			</div>
		</>
	);
}
