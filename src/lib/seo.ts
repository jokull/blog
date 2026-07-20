import { env } from "@/env";
import type {
	DetailedHTMLProps,
	LinkHTMLAttributes,
	MetaHTMLAttributes,
	ScriptHTMLAttributes,
} from "react";

const SITE_NAME = "Jökull Sólberg";
const SITE_DESCRIPTION =
	"Personal blog about web development, technology, and software engineering";

export type SeoData = {
	meta: Array<{ title?: string; name?: string; property?: string; content?: string }>;
	links: Array<{ rel: string; href: string; type?: string }>;
	scripts?: Array<{ type: string; children: string }>;
};

export type SeoHead = {
	meta: Array<DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>>;
	links: Array<DetailedHTMLProps<LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>>;
	scripts?: Array<DetailedHTMLProps<ScriptHTMLAttributes<HTMLScriptElement>, HTMLScriptElement>>;
};

export function asHead(data: SeoData): SeoHead {
	return {
		meta: data.meta.map((meta) => ({ ...meta })),
		links: data.links.map((link) => ({ ...link })),
		scripts: data.scripts?.map((script) => ({ ...script })),
	};
}

function url(path: string) {
	return new URL(path, `${env.SITE_URL.replace(/\/$/, "")}/`).toString();
}

function description(value: string) {
	return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function siteHead(): Pick<SeoData, "meta"> {
	return {
		meta: [
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:locale", content: "en_US" },
		],
	};
}

export function pageHead({
	title,
	description: pageDescription,
	path,
	image = "/og/blog/site",
	type = "website",
}: {
	title: string;
	description: string;
	path: string;
	image?: string;
	type?: "article" | "website";
}): SeoData {
	const canonical = url(path);
	const imageUrl = url(image);

	return {
		meta: [
			{ title },
			{ name: "description", content: pageDescription },
			{ property: "og:title", content: title },
			{ property: "og:description", content: pageDescription },
			{ property: "og:type", content: type },
			{ property: "og:url", content: canonical },
			{ property: "og:image", content: imageUrl },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: title },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: pageDescription },
			{ name: "twitter:image", content: imageUrl },
		],
		links: [{ rel: "canonical", href: canonical }],
	};
}

export function postHead({
	slug,
	title: postTitle,
	markdown,
	locale,
	publishedAt,
	modifiedAt,
}: {
	slug: string;
	title: string;
	markdown: string;
	locale: string;
	publishedAt: Date;
	modifiedAt: Date | null;
}) {
	const pageDescription = description(markdown) || `Read ${postTitle} on Jökull Sólberg's blog.`;
	const title = `${postTitle} — ${SITE_NAME}`;
	const head = pageHead({
		title,
		description: pageDescription,
		path: `/${slug}`,
		image: `/og/blog/${slug}`,
		type: "article",
	});

	head.meta.push(
		{ property: "og:locale", content: locale === "is" ? "is_IS" : "en_US" },
		{ property: "article:published_time", content: publishedAt.toISOString() },
		{ property: "article:modified_time", content: (modifiedAt ?? publishedAt).toISOString() },
		{ property: "article:author", content: SITE_NAME },
	);

	head.scripts = [
		{
			type: "application/ld+json",
			children: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "BlogPosting",
				headline: postTitle,
				description: pageDescription,
				url: url(`/${slug}`),
				datePublished: publishedAt.toISOString(),
				dateModified: (modifiedAt ?? publishedAt).toISOString(),
				author: { "@type": "Person", name: SITE_NAME },
			}),
		},
	];

	head.links.push({ rel: "alternate", type: "text/plain", href: url(`/${slug}.md`) });
	return head;
}

export const homeHead = (category?: { slug: string; label: string } | null): SeoData =>
	category
		? pageHead({
				title: `${category.label} — ${SITE_NAME}`,
				description: SITE_DESCRIPTION,
				path: `/?category=${encodeURIComponent(category.slug)}`,
			})
		: pageHead({ title: SITE_NAME, description: SITE_DESCRIPTION, path: "/" });

export const staticPageHead = (title: string, pageDescription: string, path: string): SeoData =>
	pageHead({ title, description: pageDescription, path });
