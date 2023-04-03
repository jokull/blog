import { z } from 'zod';

const metadataSchema = z.object({
	title: z.string(),
	date: z.coerce.date(),
	image: z.string().optional(),
	locale: z.string().optional()
});

export async function load() {
	const mdModules = import.meta.glob('../posts/**/index.md');
	const posts = await Promise.all(
		Object.keys(mdModules).map(async (path) => {
			const slug = path.split('/').at(-2);
			const { metadata } = (await mdModules[path]()) as { metadata: unknown };
			if (metadata) {
				const result = metadataSchema.safeParse({ ...metadata, slug });
				if (result.success) {
					return result.data;
				}
			}
		})
	);

	return {
		posts: posts
			.flatMap((post) => (post ? [post] : []))
			.sort((a, b) => b.date.valueOf() - a.date.valueOf())
	};
}
