const lime = '#A2E0A2';

module.exports = {
	mode: 'jit',
	purge: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			typography: {
				DEFAULT: {
					css: {
						color: '#111',
						a: { '&:hover': { color: lime } },
						// Remove quote characters from blockquotes
						'blockquote p:first-of-type::before': false,
						'blockquote p:last-of-type::after': false,
						blockquote: {
							fontFamily: 'Garamond, serif',
							fontWeight: 'normal',
							fontStyle: false
						}
					}
				}
			},
			colors: {
				lime: lime,
				hardLime: '#7EE17D'
			}
		}
	},
	plugins: [require('tailwindcss-font-inter')(), require('@tailwindcss/typography')]
};
