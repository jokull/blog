---
title: New Site
date: 2021-07-15
---

I launched my new site today. I am such a procrastinator and have been postponing it for some time
but its' finally done.

Read more about the idea from this fine Gentleman [here](https://www.solberg.is/sveltekit-blog). I
forked his repo and created this site.

Why is this website different than the old one? Few important things:

- Now rocking with Svelte ([sveltekit](https://kit.svelte.dev)) instead
  [React](https://reactjs.org/) ([gatsby](https://www.gatsbyjs.com/)) 🤙
- [Tailwind CSS] (https://tailwindcss.com/) in rescue of my design system. ™
- Run the site on the edge with [Cloudflare Workers](https://developers.cloudflare.com/). 👽
- Edit my posts with [mdsvex](https://mdsvex.com/)

Making a post and deploying with [mysite](https://github.com/nkostic/mysite) is a 3 step process,
give or take:

1. Write the article with mdsvex (md on svelte steroids)
2. Create Artifact (format and lint are automated with vscode on save)

```sh
npm run build
```

3. Deploy

```sh
wrangler publish
```

Pure joy once again.

<img src="/svelte-kit-machine.png">
