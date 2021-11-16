module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts,md}'],
	theme: {
		extend: {
			fontFamily: {
				Outfit: ['Outfit', 'sans-serif']
			},
			boxShadow: {
				sm: 'var(--shadow-elevation-low)',
				DEFAULT: 'var(--shadow-elevation-medium)',
				lg: 'var(--shadow-elevation-high)'
			},
			typography: {
				DEFAULT: {
					css: {
						// Remove quote characters from blockquotes
						'blockquote p:first-of-type::before': false,
						'blockquote p:last-of-type::after': false,
						blockquote: {
							fontWeight: 'normal',
							fontStyle: false
						},
						'pre code': {
							borderRadius: false
						}
					}
				}
			},
			colors: {
				lime: 'var(--lime)'
			}
		}
	},
	plugins: [require('tailwindcss-font-inter')(), require('@tailwindcss/typography')]
};
