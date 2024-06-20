import adapter from '@sveltejs/adapter-cloudflare';
import { escapeSvelte, mdsvex } from 'mdsvex';
import remarkAutolinkHeadings from 'remark-autolink-headings';
import remarkFootnotes from 'remark-footnotes';
import remarkSlug from 'remark-slug';
import remarkUnwrapImages from 'remark-unwrap-images';
import { codeToHtml } from 'shiki';
import { sveltePreprocess } from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
export default {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.md'],
			highlight: {
				highlighter: async (code, lang = 'text') => {
					return escapeSvelte(await codeToHtml(code, { lang, theme: 'github-dark-dimmed' }));
				}
			},
			remarkPlugins: [remarkFootnotes, remarkSlug, remarkAutolinkHeadings, remarkUnwrapImages]
		}),
		sveltePreprocess({
			postcss: true
		})
	],
	kit: {
		adapter: adapter()
	}
};
