---
title: Using OKLCH colors in Tailwind
date: 2022-06-28
---

<script>
	import TailwindPalette from '../components/TailwindPalette.svelte';
</script>

The future of CSS colors is OKLCH. It is a human friendly and powerful syntax to define colors.
Currently it is only supported in Safari but modern browser support is coming soon.

To prepare for the future and get vivid CSS colors we can actually specify a whole color palette
with a few lines of code and one PostCSS plugin.

<TailwindPalette />

`.postcssrc`

```json
{
	"plugins": {
		"tailwindcss": {},
		"@csstools/postcss-oklab-function": {}
	}
}
```

**Resources**

- https://slides.com/ai/oklch-css
- https://oklch.evilmartians.io/
- https://github.com/csstools/postcss-plugins

See the repository for a full example.

https://github.com/jokull/tailwind-oklch
