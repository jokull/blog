import { env } from "cloudflare:workers";
import { ClientErrorBoundary } from "@/components/error-boundary";
import { tryDb } from "db-result";
import { db, rawDb, decodePost } from "@/db";
import { extractFirstParagraph } from "@/lib/mdx-content-utils";
import { components } from "@/mdx-components";
import type { Metadata } from "@/src/lib/metadata";
import { throwNotFound } from "@/src/lib/router-control";
import { cache } from "react";
// safe-mdx renders MDX without eval/new Function — required on Cloudflare Workers where
// @mdx-js/mdx's run() is blocked (EvalError: Code generation from strings disallowed).
// Limitation that follows: MDX expressions and inline JS in posts do not evaluate. Custom
// JSX components (Card, Tool, etc.) work, via the components map.
import { SafeMdxRenderer } from "safe-mdx";
import { mdxParse } from "safe-mdx/parse";
import { Comments } from "@/src/blog/components/comments/comments";
import { ClipboardCopyButton } from "./_components/clipboard-copy-button";

// This enables dynamic rendering for comments
export const dynamic = "force-dynamic";

// Cache the database query for reuse
const getPost = cache(async (slug: string) => {
	const row = (
		await db.selectFrom("post").selectAll().where("slug", "=", slug).executeTakeFirst()
	).unwrap();
	if (!row) {
		throwNotFound();
	}
	return decodePost(row);
});

// Generate all possible slug values at build time
export async function generateStaticParams() {
	// db-result#4: `select` returns unwrapped builders, so the projection
	// runs on the raw db inside `tryDb`.
	const posts = (
		await tryDb(() =>
			rawDb.selectFrom("post").select("slug").where("public_at", "is not", null).execute(),
		)
	).unwrap();

	return posts.map((post) => ({
		slug: post.slug,
	}));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const post = await getPost(slug);

	const description = await extractFirstParagraph(post.markdown);
	const baseUrl = env.SITE_URL;

	const metadata: Metadata = {
		title: post.title,
		description: description.substring(0, 160),
		alternates: {
			canonical: `${baseUrl}/${post.slug}`,
			types: {
				"text/plain": `${baseUrl}/${post.slug}.md`,
			},
		},
		openGraph: {
			title: post.title,
			description: description.substring(0, 160),
			type: "article",
			url: `${baseUrl}/${post.slug}`,
			locale: post.locale === "is" ? "is_IS" : "en_US",
			publishedTime: post.publishedAt.toISOString(),
			modifiedTime: (post.modifiedAt ?? post.publishedAt).toISOString(),
			authors: ["Jökull Sólberg"],
		},
		twitter: {
			card: "summary_large_image",
			title: post.title,
			description: description.substring(0, 160),
		},
	};

	return metadata;
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const post = await getPost(slug);

	// Get user session and admin status
	let mdx: React.ReactElement | null = null;
	try {
		const mdast = mdxParse(post.markdown);
		mdx = <SafeMdxRenderer mdast={mdast} markdown={post.markdown} components={components} />;
	} catch (error) {
		console.error("[mdx] Failed to parse post markdown:", error);
		mdx = null;
	}

	// Format markdown document with title and date (same as .md version)
	const formattedDate = post.publishedAt.toISOString().split("T")[0];
	const markdownDocument = `# ${post.title}

${formattedDate}

${post.markdown}`;

	return (
		<div className="">
			<div className="mb-7">
				<h1 className="text-balance font-semibold">{post.title}</h1>
				<p className="text-sm">
					{post.publishedAt.toLocaleDateString(post.locale, {
						timeStyle: undefined,
						dateStyle: "long",
					})}
				</p>
				<ClipboardCopyButton text={markdownDocument}>Copy as markdown</ClipboardCopyButton>
			</div>
			<ClientErrorBoundary>{mdx}</ClientErrorBoundary>

			<div className="mt-12 max-w-xl border-t pt-8">
				{/*
				 * The comment thread owns its own reads and writes and loads
				 * cold. It is deliberately NOT prefetched here: this page is a
				 * server component rendered through the legacy RSC shim, and
				 * reaching the router from that environment drags the whole
				 * server graph into the RSC dependency optimizer. Comments live
				 * below the fold, so the island fetching on mount costs nothing
				 * anyone sees — and it keeps the article a pure renderer.
				 */}
				<Comments postSlug={slug} />
			</div>
		</div>
	);
}
