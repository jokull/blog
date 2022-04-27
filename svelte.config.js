import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import footnotes from 'remark-footnotes';
import headings from 'remark-autolink-headings';
import unwrapImages from 'remark-unwrap-images';
import slug from 'remark-slug';

const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		preprocess({
			postcss: true
		}),
		mdsvex({
			extensions: ['.md'],
			layout: {
				_: './src/layouts/post.svelte',
				books: './src/layouts/book.svelte'
			},
			remarkPlugins: [footnotes, slug, headings, unwrapImages]
		})
	],
	kit: {
		adapter: adapter()
	}
};

export default config;
