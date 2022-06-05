export default async () => {
	let posts = await Promise.all(
		Object.entries(import.meta.glob('/src/routes/books/*.md')).map(async ([path, page]) => {
			const { metadata } = await page();
			let pathComponents = path.split('/');
			const filename = pathComponents.pop();
			const slug = filename.split('.md', 1)[0];
			return { ...metadata, filename, slug };
		})
	);
	return posts;
};
