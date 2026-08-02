/**
 * A comment's body.
 *
 * The markdown is rendered on the server and arrives as `contentHtml`, so this
 * component parses nothing and the browser downloads no markdown or highlighter
 * code to display a thread. See `src/blog/comment-markdown.ts` for why that HTML
 * is safe to inject: the parser has no raw-HTML node and allowlists link
 * schemes.
 *
 * `html` is null only for an optimistic row the server has not answered yet.
 * Plain text is the honest rendering of one — it is what the author just typed,
 * and it is about to be replaced.
 */
export function CommentBody({ content, html }: { content: string; html: string | null }) {
	if (html === null) {
		return <div className="whitespace-pre-wrap">{content}</div>;
	}

	return (
		<div
			className="comment-body max-w-none first:[&>*]:mt-0"
			// oxlint-disable-next-line react/no-danger -- `@tanstack/markdown` has no raw-HTML node (tags come out escaped) and allowlists link schemes, so its output is sanitised by construction. See `src/blog/comment-markdown.ts`.
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
