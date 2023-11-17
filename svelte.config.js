import adapter from '@sveltejs/adapter-cloudflare';
import { escapeSvelte, mdsvex } from 'mdsvex';
import remarkAutolinkHeadings from 'remark-autolink-headings';
import remarkFootnotes from 'remark-footnotes';
import remarkSlug from 'remark-slug';
import remarkUnwrapImages from 'remark-unwrap-images';
import shiki from 'shiki';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
export default {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.svelte.md', '.md', '.svx'],
			highlight: {
				highlighter: async (code, lang = 'text') => {
					const highlighter = await shiki.getHighlighter({ theme: 'github-dark-dimmed' });
					const html = escapeSvelte(highlighter.codeToHtml(code, { lang }));
					return `{@html \`${html}\` }`;
				}
			},
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
