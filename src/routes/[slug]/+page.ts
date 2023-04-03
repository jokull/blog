import { postSchema } from '$lib/schemas';

export async function load({ params }) {
	const { slug } = params;

	const post = await import(/* @vite-ignore */ `../../_posts/${slug}/post.md`);

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

	return { page, metadata: result.data };
}
