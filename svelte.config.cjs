const Prism = require('prismjs');
require('prism-svelte');
const preprocess = require('svelte-preprocess');
const adapter = require('@sveltejs/adapter-static');
const { mdsvex } = require('mdsvex');
const headings = require('remark-autolink-headings');
const slug = require('remark-slug');
const footnotes = require('remark-footnotes');

const highlighter = (str, lang) => {
	let escaped = '';
	if (lang && lang in Prism.languages) {
		const parsed = Prism.highlight(str, Prism.languages[lang], lang);
		escaped = parsed.replace(/{/g, '&#123;').replace(/}/g, '&#125;');
	} else {
		escaped = str.replace(/{/g, '&#123;').replace(/}/g, '&#125;');
	}
	return `<pre class="language-${lang}"><code>${escaped}</code></pre>`;
};

/** @type {import('@sveltejs/kit').Config} */
module.exports = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		preprocess({
			postcss: true
		}),
		mdsvex({
			extensions: ['.md'],
			highlight: {
				highlighter: highlighter
			},
			layout: './src/components/blog-post.svelte',
			remarkPlugins: [footnotes, slug, headings]
		})
	],
	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		adapter: adapter()
	}
};
