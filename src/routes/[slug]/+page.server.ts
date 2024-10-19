import { postSchema } from '$lib/schemas';
import type { EntryGenerator } from './$types.js';

export const prerender = true;

export function entries(): ReturnType<EntryGenerator> {
	const slugs = Object.keys(import.meta.glob('../../_posts/**/post.md')).map((path) =>
		path.split('/').at(-2)
	);
	return slugs.filter((slug) => typeof slug === 'string').map((slug) => ({ slug: slug! }));
}

export async function load({ params }) {
	const { slug } = params;

	const post = await import(`../../_posts/${slug}/post.md`);

	const { default: page, metadata } = post;

	if (!page) {
		return {
			status: 404
		};
	}

	const result = postSchema.safeParse({ ...(metadata ?? {}), slug });

	if (!result.success) {
		return { status: 404 };
	}

	return { metadata: result.data, page: page.render().html };
}
