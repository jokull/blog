import { decodeNote, withDb } from "@/db";
import { components } from "@/mdx-components";
import type { Metadata } from "@/src/lib/metadata";
import { Link } from "@/src/lib/navigation";
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

	const rows = (
		await withDb((db) =>
			db
				.selectFrom("note")
				.selectAll()
				.where("published_at", "is not", null)
				.$if(Boolean(cursor), (qb) =>
					qb.where("published_at", "<", new Date(Number(cursor))),
				)
				.orderBy("published_at", "desc")
				.limit(PAGE_SIZE + 1)
				.execute(),
		)
	).unwrap();
	const notes = rows.map(decodeNote);

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
							{rendered ? (
								<div className="prose prose-stone prose-sm">{rendered}</div>
							) : null}
							{date ? (
								<a
									href={`https://x.com/i/status/${note.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-stone-400 hover:text-stone-600"
								>
									<time>{date}</time>
								</a>
							) : null}
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
