import { bookSchema } from '$lib/schemas';

export async function load() {
	let mdModules = import.meta.glob('../_books/**/post.md');
	const books = await Promise.all(
		Object.keys(mdModules).map(async (path) => {
			const slug = path.split('/').at(-2);
			const { metadata } = (await mdModules[path]()) as { metadata: unknown };
			if (metadata) {
				const result = bookSchema.safeParse({ ...metadata, slug });
				if (result.success) {
					return result.data;
				} else {
					throw new Error(JSON.stringify(result.error, undefined, 2));
				}
			}
		})
	);
	return { books: books.flatMap((book) => (book ? [book] : [])) };
}
