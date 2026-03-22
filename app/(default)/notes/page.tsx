import { db } from "@/db";
import { components } from "@/mdx-components";
import { Note } from "@/schema";
import { and, desc, isNotNull, lt } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { SafeMdxRenderer } from "safe-mdx";
import { mdxParse } from "safe-mdx/parse";

export const metadata: Metadata = {
	title: "Notes — Jökull Sólberg",
	description: "Curated links and commentary",
	alternates: {
		canonical: "/notes",
	},
};

const PAGE_SIZE = 20;

export default async function NotesPage({
	searchParams,
}: {
	searchParams: Promise<{ cursor?: string }>;
}) {
	const { cursor } = await searchParams;

	const where = cursor
		? and(isNotNull(Note.publishedAt), lt(Note.publishedAt, new Date(Number(cursor))))
		: isNotNull(Note.publishedAt);

	const notes = await db.query.Note.findMany({
		where,
		orderBy: [desc(Note.publishedAt)],
		limit: PAGE_SIZE + 1,
	});

	const hasMore = notes.length > PAGE_SIZE;
	const items = hasMore ? notes.slice(0, PAGE_SIZE) : notes;
	const nextCursor = hasMore ? items[items.length - 1]?.publishedAt?.getTime() : null;

	return (
		<div className="max-w-xl">
			<h1 className="mb-8 font-medium text-lg">Notes</h1>
			<div className="flex flex-col gap-8">
				{items.map((note) => {
					let rendered: React.ReactElement | null = null;
					if (note.description) {
						try {
							const mdast = mdxParse(note.description);
							rendered = (
								<SafeMdxRenderer
									mdast={mdast}
									markdown={note.description}
									components={components}
								/>
							);
						} catch {
							rendered = null;
						}
					}

					const date = note.publishedAt
						? note.publishedAt.toLocaleDateString("en", {
								month: "short",
								day: "numeric",
							})
						: null;

					return (
						<article key={note.id} className="flex flex-col gap-1">
							<div className="flex items-baseline gap-2 text-sm text-stone-500">
								{date ? <time>{date}</time> : null}
								{date && note.sourceAuthor ? <span>·</span> : null}
								{note.sourceAuthor ? (
									note.sourceUrl ? (
										<a
											href={note.sourceUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:text-stone-700"
										>
											@{note.sourceAuthor}
										</a>
									) : (
										<span>@{note.sourceAuthor}</span>
									)
								) : null}
							</div>
							<div className="prose prose-stone prose-sm">
								<p>
									<a
										href={note.url}
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium no-underline hover:underline"
									>
										{note.title}
									</a>
									{rendered ? (
										<>
											{" — "}
											<span className="*:inline">{rendered}</span>
										</>
									) : null}
								</p>
							</div>
						</article>
					);
				})}
			</div>
			{nextCursor ? (
				<div className="mt-8">
					<Link
						href={`/notes?cursor=${nextCursor}`}
						className="text-blue-500 hover:text-blue-600 text-sm"
					>
						Older notes
					</Link>
				</div>
			) : null}
		</div>
	);
}
