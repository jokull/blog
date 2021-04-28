const preprocess = require('svelte-preprocess');
const adapter = require('@sveltejs/adapter-static');
const { mdsvex } = require('mdsvex');
const footnotes = require('remark-footnotes');
const headings = require('remark-autolink-headings');
const unwrapImages = require('remark-unwrap-images');
const slug = require('remark-slug');

/** @type {import('@sveltejs/kit').Config} */
module.exports = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		preprocess({
			postcss: true
		}),
		mdsvex({
			extensions: ['.md'],
			layout: './src/components/blog-post.svelte',
			remarkPlugins: [footnotes, slug, headings, unwrapImages]
		})
	],
	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		adapter: adapter()
	}
};
