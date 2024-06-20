import { postSchema } from '$lib/schemas';

export const prerender = true;

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
