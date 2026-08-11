import type { Result } from "better-result";
import { safeFetch, type FetchError } from "./safe-utils";

/**
 * The verdict on one checked URL: the server answered with an HTTP status
 * (`code` — 4xx/5xx included, those are what the checker hunts), or the
 * request never completed (`unreachable`).
 */
export type LinkVerdict = { kind: "status"; code: number } | { kind: "unreachable" };

export interface BrokenLink {
	postSlug: string;
	postTitle: string;
	url: string;
	type: "link" | "image";
	status: LinkVerdict;
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

	// Dedupe URLs, check each once. The verdict for a URL is a Result: Ok
	// carries the HTTP status the server answered with (any code — a 404 is
	// data, not a failure), Err means the request never completed.
	const uniqueUrls = [...new Set(urlChecks.map((c) => c.url))];
	const verdicts = new Map<string, Result<number, FetchError>>();
	for (let i = 0; i < uniqueUrls.length; i += 10) {
		const batch = uniqueUrls.slice(i, i + 10);
		const results = await Promise.all(
			batch.map(async (url) => {
				const response = await safeFetch(url, {
					method: "HEAD",
					signal: AbortSignal.timeout(5000),
					redirect: "follow",
				});
				return [url, response.map((r) => r.status)] as const;
			}),
		);
		for (const [url, verdict] of results) verdicts.set(url, verdict);
	}

	for (const check of urlChecks) {
		const verdict = verdicts.get(check.url);
		if (verdict === undefined) continue;
		// unwrapOr: null is the transport failure — the server never answered.
		// A 4xx/5xx and unreachable are both broken; a 2xx/3xx is not.
		const code = verdict.unwrapOr(null);
		if (code !== null && code < 400) continue;
		broken.push({
			postSlug: check.postSlug,
			postTitle: check.postTitle,
			url: check.url,
			type: check.type,
			status: code === null ? { kind: "unreachable" } : { kind: "status", code },
		});
	}

	return broken;
}
