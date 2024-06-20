import { bookSchema } from '$lib/schemas';

export async function load({ params }) {
	const { slug } = params;

	const post = await import(`../../../_books/${slug}/post.md`);

	const { default: page, metadata } = post;

	if (!page) {
		return {
			status: 404
		};
	}

	const result = bookSchema.safeParse({ ...(metadata ?? {}), slug });

	if (!result.success) {
		return { status: 404 };
	}

	return { metadata: result.data, page: page.render().html };
}
