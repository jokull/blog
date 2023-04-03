---
title: Creating a blog using SvelteKit, Tailwind and Cloudflare hosting
date: 2021-04-27
---

<script>
  import PhotoCaption from '../../components/PhotoCaption.svelte';
</script>

Up until now I've used [Lektor](https://www.getlektor.com), a Python based static site generator.

Since discovering Tailwind CSS I've wanted to move as many projects to rely on that as possible.
It's an absolute joy to use, makes CSS more maintainable, faster and just easier to reason about.
Since discovering Svelte, then Sapper, then SvelteKit (the new Sapper powered by Vite, similar to
Next.js), I've started using Svelte[-Kit] for many of my projects:

- [The Big List of Icelandic Digital Agencies](https://www.agencies.is).
- [x2021](https://x2021.is) - a fun political quiz to place you on the left-right spectrum
- My wedding RSVP site 👰🏻✨

[SvelteKit](https://kit.svelte.dev) is still beta but API is maturing quickly. Those who know
Next.js know what it's about. It helps you deliver a silky smooth user experiencing by giving
complete control over what happens on the backend before a page is delivered, what happens when the
page loads as well as classic component hierarchies for interactivity once the page has been
hydrated in the browser. It's the marriage of the SEO friendly server template HTML and more modern
Single-Page Apps world — and one where it doesn’t feel you sacrifice anything to get the best of
both worlds. SvelteKit has filesystem based routing which lends itself nicely to blogs since each
file or folder becomes a route.

Internally SvelteKit uses Vite which in turn uses `esbuild` to compile JavaScript to bundles
supported by modern browsers. SvelteKit does a bunch of other nice things like catch link events to
switch pages using an internal router, resulting in super fast navigation that still preserves
scrollbar position.

Recently Tailwind CSS has adopted (an optional for now) JIT compiler. Before JIT every single class
from the Tailwind library was loaded in the browser in development. With the increasingly large
scope of Tailwind this file was starting to reach the threshold of what browsers can comfortably
handle for a single page. During the build phase a code scanner would detect the classes you made
use of and purge the rest to decrease filesize. Now with JIT however, this purge step has been sped
up significantly to the point of being comfortably performed on every file change - resulting in
only the classes being used being loaded in the browser, even in development. This allows for an
even bigger total composable class library, allowing all variants, even new ones, being available
from the get-go, — and the build phase becomes much much faster!

Tailwind is an incredibly exciting project and new way to style.

## Structure

Head on over to [github.com/jokull/blog](https://github.com/jokull/blog) to inspect the repo. I'll
be going through a few things to explain how this came together. I picked up a number of things from
the [Gitpod](https://github.com/gitpod-io/website) website code they were kind enough to open
source.

```
.
├── README.md
├── jsconfig.json
├── package-lock.json
├── package.json
├── postcss.config.cjs
├── src
│   ├── app.html
│   ├── app.postcss
│   ├── components
│   │   ├── PhotoCaption.svelte
│   │   └── blog-post.svelte
│   ├── global.d.ts
│   ├── hooks.js
│   ├── lib
│   │   └── prism-theme.postcss
│   └── routes
│       ├── $layout.svelte
│       ├── 2018-in-review.md
│       ├── 2019-in-review.md
│       ├── 2020-in-review.md
│       └── ...
├── static
│   ├── blog
│   │   ├── IMG_0567.JPG
│   │   ├── IMG_2528.JPG
│   │   └── ...
│   ├── favicon.svg
│   ├── keybase.txt
│   └── profile.jpg
├── svelte.config.cjs
├── tailwind.config.cjs
└── wrangler.toml
```

## Svelte Config

The config is a little bit more complex to add Svelte support to the code highlighter, but this
might give you an idea.

```js
/* svelte.config.cjs */
const preprocess = require('svelte-preprocess');
const adapter = require('@sveltejs/adapter-static');
const { mdsvex } = require('mdsvex');
const headings = require('remark-autolink-headings');
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
			remarkPlugins: [slug, headings]
		})
	],
	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		adapter: adapter()
	}
};
```

## Tailwind CSS

Tailwind uses JIT mode which increases the number of variant classes available out of the box (for
example the `last:` variant used to remove the bottom border from the last blog post in the index).
Two plugins are used; [Typography](https://github.com/tailwindlabs/tailwindcss-typography) that adds
a some default styling to make Markdown sections readable, and
[Inter](https://github.com/semencov/tailwindcss-font-inter) that tweaks sizing and spacing for the
super nice Inter font by [rsms](https://twitter.com/rsms).

## Markdown

Markdown is handled by [mdsvex](https://mdsvex.com) which lets you mix Markdown, various Remark
plugins to add features and Svelte components together. Highlighting of code blocks is something
that comes with the default mdsvex configuration and works out of the box.

Markdown doesn't let you do captions below photos, something I wanted to support:

<!-- prettier-ignore -->
```svelte
/* src/components/PhotoCaption.svelte */

<script>
	export let url;
	export let caption;
	export let wider = false;
</script>

<div class={`${wider ? 'wider' : ''} mb-4`}>
	<img class="!mb-2" src={url} alt={caption} />
	<div class="text-sm text-center">{caption}</div>
</div>
```

An example post might be:

<!-- prettier-ignore -->
```md
---
title: My post
date: 2020-1-1
---

<script>
  import PhotoCaption from "../components/PhotoCaption.svelte";
</script>

# Markdown header

<PhotoCaption url='/blog/biarritz.jpg' caption='Family in Biarritz.' />

Markdown paragraph
```

And the photo renders like this:

<PhotoCaption url='/blog/biarritz.jpg' caption='Family in Biarritz.' />

The blog svelte page used to render Markdown looks like this:

<!-- prettier-ignore -->
```svelte
/* src/components/blog-post.svelte */
<script>
	import '$lib/prism-theme.postcss';

	export let title;
	export let date;
	export let image;
	let dateDisplay = new Date(Date.parse(date)).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
</script>

<svelte:head>
	<title>{title} - Jökull Sólberg</title>
</svelte:head>

<div class="prose prose-sm sm:prose page max-w-none sm:max-w-none">
	<div class="py-8 sm:py-10 sm:text-center">
		<div class="font-bold text-4xl mb-4">{title}</div>
		<div class="text-sm">{dateDisplay}</div>
	</div>
	{#if image}
		<img src={`/blog/${image}`} class="full-bleed" alt="Banner" />
	{/if}
	<slot />
</div>
```

You have may have noticed a custom Prism theme added there for the code highlighting library. I
decided to make it a PostCSS file so I can add Tailwind classes where needed.

To make posts available to the index page I'm adding it via a SvelteKit session hook (stolen from
Gitpod):

```js
/* src/hooks.js */
/** @type {import('@sveltejs/kit').GetSession} */
export const getSession = async () => {
	const markdownFiles = import.meta.glob('/src/routes/*.md');
	const posts = await Promise.all(
		Object.entries(markdownFiles).map(async ([path, page]) => {
			const { metadata } = await page();
			let pathComponents = path.split('/');
			const filename = pathComponents.pop();
			const slug = filename.split('.md', 1)[0];
			return { ...metadata, filename, slug };
		})
	);
	posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

	return {
		posts
	};
};
```

… which then becomes available in `src/routes/index.svelte`:

```svelte
<script context="module">
	export const prerender = true;
	export async function load({ session }) {
		const posts = session.posts;
		return { props: { posts } };
	}
</script>

/* trimmed ... */
```

## Moving from GitHub Pages to Cloudflare Worker

GitHub Pages is a great service and I love that it comes free with all repos. The `gh-pages` utility
makes it very easy to push a build directory (usually .gitignored on the main branch) to a
`gh-pages` branch, which GitHub automatically uses for the static build. By default static sites are
deployed into a `/{repository-name}` subpath which can easily break links and references assuming a
root `/` deployment.

Another issue I've had is with custom domains. The combination of DNS lag, CNAME top level file,
having to opt out of Jekyll support, gh-pages purging dotfiles by default, the flakey GitHub Pages
settings tab ... it's all a bit wonkey. When it works it's nice, but when it doesn't it's very
frustrating.

Cloudflare Worker free-tier to the rescue! What CF Workers allow you to do is host code on hundreds
of edge servers with response times measured in milliseconds. It gives your pages an extremely
snappy feel. SvelteKit even comes with adapter allowing you to ship backend code to hydrate pages
and perform other backend tasks. Some people call this serverless, but this is really all about
pushing computing - and not just static assets - to edge servers to deliver a fast user experience.

Even though SvelteKit comes with an adapter to host sites on Cloudflare Workers, I opted for the
static adapter to output a build that is then pushed to Cloudflare. That's mostly because I don't
have the need for any backend processing, although it's tempting to test the Cloudflare Worker just
to see how it works.

Setting up a site on Cloudflare means transitioning DNS hosting to their servers. I was confused as
to how you point a CNAME to a worker.

Apparently you just set a CNAME pointing to `100::` — an IPv6 address. 🤨

Then in the Clouflare `wrangler.toml` project file set the `route` thusly:

```toml
name = "blog"
type = 'webpack'
account_id = '...'
route = 'www.solberg.is/*'
zone_id = '...'
usage_model = ''
workers_dev = true
target_type = "webpack"
site = {bucket = "./build",entry-point = "workers-site"}
```

The `site.bucket` key points to `./build` which is the default static output directory of the
SvelteKit static adapter.

This GitHub Action performs the build-and-deploy dance so all I need to do is push new .md files to
the main branch:

```yaml
name: cloudflare-publish

on:
  push:
    branches:
      - master
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-18.04
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '16.x'

      - name: Get npm cache directory
        id: npm-cache-dir
        run: |
          echo "::set-output name=dir::$(npm config get cache)"

      - uses: actions/cache@v2
        id: npm-cache # use this to check for `cache-hit` ==> if: steps.npm-cache.outputs.cache-hit != 'true'
        with:
          path: ${{ steps.npm-cache-dir.outputs.dir }}
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - run: npm install
      - run: npm run build

      - name: Publish on Cloudflare
        uses: cloudflare/wrangler-action@1.2.0
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
```

You’ll need to copy your Cloudflare API key to the GitHub repo secrets for this to work.

## Niceties

I wanted Prettier to hard-wrap Markdown files, but not touch double-whitespace at the end of lines
since that can indicate a `&lt;br&gt;` — just set `proseWrap: "always"`.

```json
{
	"useTabs": true,
	"singleQuote": true,
	"trailingComma": "none",
	"printWidth": 100,
	"proseWrap": "always"
}
```

### RSS Feed

Adding an RSS XML is easy in SvelteKit. Simply create a `routes/feed.xml.js` file that exports a get
function that returns a `{body: xmlString}`. Mine looks like this:

```js
import getPosts from '$lib/getPosts';

const siteUrl = 'https://www.solberg.is';

const renderXmlRssFeed = (posts) => `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Jökull Sólberg</title>
    <link>${siteUrl}</link>
    ${posts
			.map(
				(post) => `
    <item>
       <title>${post.title}</title>
       <link>${siteUrl}/${post.slug}</link>
       <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>
    `
			)
			.join('\n')}
  </channel>
</rss>`;

export async function get() {
	const feed = renderXmlRssFeed(await getPosts());
	return {
		body: feed,
		headers: { 'content-type': 'application/rss+xml' }
	};
}
```

## Issues

- ~~I still haven't got the footnotes Remark plugin to work.~~  
  **UPDATE:** Make sure to install `npm add --save-dev remark-footnotes@2.0` - 3.0 does not work
  with mdsvex.
- UPDATE May 3: [/feed.xml](/feed.xml) added - with a blog section.
- It can be kind of frustrating that Tailwind Typography sets a `.prose` class on your top level
  element that stores the Markdown output in your DOM. There is currently no neat way to have other
  Tailwind classes (such as ones on the `PhotoCaption` component) take precedence. I resorted to
  using `!important` hack, which the JIT plugin makes easy to do actually: `class="!mb-2"`
