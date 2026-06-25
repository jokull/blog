import { getGithubUser, getSession, isAdmin } from "@/auth";
import { CommentsSection } from "@/components/comments-section";
import { ClientErrorBoundary } from "@/components/error-boundary";
import { db } from "@/db";
import { env } from "@/env";
import { extractFirstParagraph } from "@/lib/mdx-content-utils";
import { components } from "@/mdx-components";
import type { Metadata } from "@/src/lib/metadata";
import { throwNotFound } from "@/src/lib/router-control";
import { cache } from "react";
// safe-mdx renders MDX without eval/new Function — required on Cloudflare Workers where
// @mdx-js/mdx's run() is blocked (EvalError: Code generation from strings disallowed).
// Regression: MDX expressions and inline JS in posts no longer evaluate. Custom JSX
// components (Card, Tool, etc.) still work via the components map.
import { SafeMdxRenderer } from "safe-mdx";
import { mdxParse } from "safe-mdx/parse";
import { ClipboardCopyButton } from "./_components/clipboard-copy-button";

// This enables dynamic rendering for comments
export const dynamic = "force-dynamic";

// Cache the database query for reuse
const getPost = cache(async (slug: string) => {
	const post = await db.query.Post.findFirst({ where: { slug } });
	if (!post) {
		throwNotFound();
	}
	return post;
});

// Generate all possible slug values at build time
export async function generateStaticParams() {
	const posts = await db.query.Post.findMany({
		columns: {
			slug: true,
		},
		where: { publicAt: { isNotNull: true } },
	});

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
	const session = await getSession();
	const isAdminUser = await isAdmin();

	let user = null;
	if (session.githubUsername) {
		try {
			const githubUser = await getGithubUser(session.githubUsername);
			user = {
				email: "",
				githubId: githubUser.id,
				githubUsername: githubUser.login,
				name: githubUser.name ?? githubUser.login,
				avatarUrl: githubUser.avatar_url,
			};
		} catch (error) {
			console.error("[github] Failed to fetch user:", error);
		}
	}

	// Fetch comments for this post
	const comments = await db.query.Comment.findMany({
		where: { postSlug: slug },
		orderBy: { createdAt: "asc" }, // Oldest first (chronological order)
	});

	// Pre-render markdown content for each comment
	const commentsWithRenderedContent = comments.map((comment) => {
		let renderedContent: React.ReactElement | null = null;

		try {
			const mdast = mdxParse(comment.content);
			renderedContent = (
				<SafeMdxRenderer mdast={mdast} markdown={comment.content} components={components} />
			);
		} catch {
			renderedContent = null;
		}

		return {
			...comment,
			renderedContent,
		};
	});

	// Get visible comment count
	const visibleComments = commentsWithRenderedContent.filter(
		(comment) => !comment.isHidden || isAdminUser,
	);
	const commentCount = visibleComments.length;

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
				<CommentsSection
					postSlug={slug}
					user={user}
					comments={visibleComments}
					commentCount={commentCount}
					isAdmin={isAdminUser}
					currentUsername={session.githubUsername}
				/>
			</div>
		</div>
	);
}
