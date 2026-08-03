import { safeFetch } from "./safe-utils";

export interface BrokenLink {
	postSlug: string;
	postTitle: string;
	url: string;
	type: "link" | "image";
	status: number | "error";
}

const LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const JSX_IMAGE_REGEX = /<Image[^>]+src=["']([^"']+)["']/g;
const HTML_IMG_REGEX = /<img[^>]+src=["']([^"']+)["']/g;

function extractUrls(markdown: string): { url: string; type: "link" | "image" }[] {
	const results: { url: string; type: "link" | "image" }[] = [];
	const seen = new Set<string>();

	// Images first (so we tag them correctly before link regex catches them)
	for (const match of markdown.matchAll(IMAGE_REGEX)) {
		const url = match[2].split(" ")[0]; // strip title
		if (!seen.has(url)) {
			seen.add(url);
			results.push({ url, type: "image" });
		}
	}
	for (const match of markdown.matchAll(JSX_IMAGE_REGEX)) {
		if (!seen.has(match[1])) {
			seen.add(match[1]);
			results.push({ url: match[1], type: "image" });
		}
	}
	for (const match of markdown.matchAll(HTML_IMG_REGEX)) {
		if (!seen.has(match[1])) {
			seen.add(match[1]);
			results.push({ url: match[1], type: "image" });
		}
	}

	// Links (excluding already-found images)
	for (const match of markdown.matchAll(LINK_REGEX)) {
		const url = match[2].split(" ")[0];
		if (!seen.has(url) && !url.startsWith("#")) {
			seen.add(url);
			results.push({ url, type: "link" });
		}
	}

	return results;
}

function resolveUrl(url: string, siteUrl: string): string | null {
	// Skip local asset references (relative paths to bundled images)
	if (url.startsWith("./") || url.startsWith("../")) return null;
	// Skip mailto, tel, javascript
	if (/^(mailto:|tel:|javascript:)/.test(url)) return null;
	// Absolute URL
	if (url.startsWith("http://") || url.startsWith("https://")) return url;
	// Root-relative
	if (url.startsWith("/")) return `${siteUrl}${url}`;
	return null;
}

export async function checkPostLinks(
	posts: { slug: string; title: string; markdown: string }[],
	siteUrl: string,
): Promise<BrokenLink[]> {
	const broken: BrokenLink[] = [];
	const urlChecks: {
		postSlug: string;
		postTitle: string;
		url: string;
		type: "link" | "image";
	}[] = [];

	for (const post of posts) {
		const urls = extractUrls(post.markdown);
		for (const { url, type } of urls) {
			const resolved = resolveUrl(url, siteUrl);
			if (resolved) {
				urlChecks.push({ postSlug: post.slug, postTitle: post.title, url: resolved, type });
			}
		}
	}

	// Dedupe URLs, check each once
	const uniqueUrls = [...new Set(urlChecks.map((c) => c.url))];

	// Check in batches of 10
	const statusMap = new Map<string, number | "error">();
	for (let i = 0; i < uniqueUrls.length; i += 10) {
		const batch = uniqueUrls.slice(i, i + 10);
		const results = await Promise.all(
			batch.map(async (url) => {
				const result = await safeFetch(url, {
					method: "HEAD",
					signal: AbortSignal.timeout(5000),
					redirect: "follow",
				});
				if (result.isErr()) return { url, status: "error" as const };
				return { url, status: result.value.status };
			}),
		);
		for (const r of results) {
			statusMap.set(r.url, r.status);
		}
	}

	for (const check of urlChecks) {
		const status = statusMap.get(check.url);
		if (status !== undefined && (status === "error" || status >= 400)) {
			broken.push({
				postSlug: check.postSlug,
				postTitle: check.postTitle,
				url: check.url,
				type: check.type,
				status,
			});
		}
	}

	return broken;
}
