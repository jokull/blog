---
title: New Site
date: 2021-07-15
---

I launched my new site today. I am such a procrastinator and have been postponing it for some time
but its' finally done.

Read more about inception of this site roots in detail in post made by this fine gentleman
[here](https://www.solberg.is/sveltekit-blog). I was planning to bootstrap this stack myself; partly
I already did but when I stumbled upon this repo I just decided to forked it and created
[mysite](https://github.com/nkostic/mysite). Big kudos to Jökull Sólberg for making exactly what I
needed.

Why is this website different than the old one? Few important things:

- Now rocking with Svelte ([sveltekit](https://kit.svelte.dev)) instead
  [React](https://reactjs.org/) ([gatsby](https://www.gatsbyjs.com/)) 🤙
- [Tailwind CSS] (https://tailwindcss.com/) in rescue of my design system. ™
- Run the site on the edge with [Cloudflare Workers](https://developers.cloudflare.com/). 👽
- Edit my posts with [mdsvex](https://mdsvex.com/)

Making a post and deploying with [mysite](https://github.com/nkostic/mysite) is a 3 step process,
give or take:

1. Write the article with mdsvex (md on svelte steroids)
2. Create Artifact (hint: automate format and lint with vscode on save)

```sh
npm run build
```

3. Deploy

```sh
wrangler publish
```

Pure joy once again.

<img src="/svelte-kit-machine.png">
