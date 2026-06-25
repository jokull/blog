import type { ReactElement, ReactNode } from "react";
// safe-mdx: no eval/new Function — needed for Cloudflare Workers (see slug/page.tsx)
import { SafeMdxRenderer } from "safe-mdx";
import { mdxParse } from "safe-mdx/parse";
import { requireAdmin } from "@/auth";
import { ClientErrorBoundary } from "@/components/error-boundary";
import { db } from "@/db";
import { components } from "@/mdx-components";
import { Post } from "@/schema";
import { Editor } from "./_components/editor";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	await requireAdmin(`/${slug}/editor`);

	let post = await db.query.Post.findFirst({ where: { slug } });
	post ??= await db
		.insert(Post)
		.values({
			slug,
			title: "New Post",
			markdown: "# New Post",
			publicAt: new Date(),
			createdAt: new Date(),
			publishedAt: new Date(),
		})
		.returning()
		.get();

	let mdx: ReactElement | null = null;
	let mdxError: ReactNode | null = null;
	try {
		const markdown = post.previewMarkdown ?? post.markdown;
		const mdast = mdxParse(markdown);
		mdx = <SafeMdxRenderer mdast={mdast} markdown={markdown} components={components} />;
	} catch (error: unknown) {
		mdxError = <div>{String(error)}</div>;
	}

	return (
		<Editor post={post} mdx={mdxError ?? <ClientErrorBoundary>{mdx}</ClientErrorBoundary>} />
	);
}
