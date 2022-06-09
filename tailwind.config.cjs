/** @type {import("@types/tailwindcss/tailwind-config").TailwindConfig} **/
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts,md}'],
	theme: {
		extend: {
			fontFamily: {
				Clash: ['Clash', 'sans-serif']
			},
			boxShadow: {
				sm: 'var(--shadow-elevation-low)',
				DEFAULT: 'var(--shadow-elevation-medium)',
				lg: 'var(--shadow-elevation-high)'
			},
			backgroundImage: {
				smooth: 'var(--smooth-gradient)'
			},
			typography: () => ({
				DEFAULT: {
					css: {
						h2: { fontWeight: '500' },
						h3: { fontWeight: '500' },
						// Remove quote characters from blockquotes
						'blockquote p:first-of-type::before': false,
						'blockquote p:last-of-type::after': false,
						blockquote: {
							fontWeight: 'normal',
							fontStyle: false
						},
						'pre code': {
							borderRadius: false
						},
						'--tw-prose-bullets': 'var(--lime)'
					}
				}
			}),
			colors: {
				lime: 'var(--lime)'
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
};
