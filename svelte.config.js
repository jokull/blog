import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-cloudflare';
import { mdsvex } from 'mdsvex';
import remarkFootnotes from 'remark-footnotes';
import remarkSlug from 'remark-slug';
import remarkAutolinkHeadings from 'remark-autolink-headings';
import remarkUnwrapImages from 'remark-unwrap-images';

/** @type {import('@sveltejs/kit').Config} */
export default {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.svelte.md', '.md', '.svx'],
			remarkPlugins: [remarkFootnotes, remarkSlug, remarkAutolinkHeadings, remarkUnwrapImages]
		}),
		preprocess({
			postcss: true
		})
	],
	kit: {
		adapter: adapter()
	}
};
