---
title: Using OKLCH colors in Tailwind
date: 2022-06-28
---

The future of CSS colors is OKLCH. It is a human friendly and powerful syntax to define colors.
Currently it is only supported in Safari but modern browser support is coming soon.

To prepare for the future and get vivid CSS colors we can actually specify a whole color palette
with a few lines of code and one PostCSS plugin.

![](https://user-images.githubusercontent.com/701/176175125-cf524714-48b5-4c60-8072-b95aa2f1c3ad.png)

`styles.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
	--accent-50: oklch(97% 0.3 10);
	--accent-100: oklch(92% 0.3 10);
	--accent-200: oklch(83% 0.3 10);
	--accent-300: oklch(76% 0.3 10);
	--accent-400: oklch(70% 0.3 10);
	--accent-500: oklch(64% 0.3 10);
	--accent-600: oklch(56% 0.3 10);
	--accent-700: oklch(48% 0.3 10);
	--accent-800: oklch(41% 0.3 10);
	--accent-900: oklch(29% 0.3 10);
}
```

The three parameters are L (lightness) C (chroma) and H (hue). You'll notice that the chroma and hue
are consistent. Try modifying just chroma.

`tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				primary: {
					50: 'var(--accent-50)',
					100: 'var(--accent-100)',
					200: 'var(--accent-200)',
					300: 'var(--accent-300)',
					400: 'var(--accent-400)',
					500: 'var(--accent-500)',
					600: 'var(--accent-600)',
					700: 'var(--accent-700)',
					800: 'var(--accent-800)',
					900: 'var(--accent-900)'
				}
			}
		}
	},
	variants: {
		extend: {}
	},
	plugins: []
};
```

`.postcssrc`

```json
{
	"plugins": {
		"tailwindcss": {},
		"@csstools/postcss-oklab-function": {}
	}
}
```

See the repository for a full example.

https://github.com/jokull/tailwind-oklch
