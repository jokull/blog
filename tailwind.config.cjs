const lime = '#1d12e4';

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
						},
						'pre code': {
							borderRadius: false
						}
					}
				}
			},
			colors: {
				lime: lime,
				hardLime: '#1d12e4'
			}
		}
	},
	plugins: [require('tailwindcss-font-inter')(), require('@tailwindcss/typography')]
};
