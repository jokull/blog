const lime = '#A2E0A2';

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts,md}'],
	theme: {
		extend: {
			typography: {
				DEFAULT: {
					css: {
						// Remove quote characters from blockquotes
						'blockquote p:first-of-type::before': false,
						'blockquote p:last-of-type::after': false,
						blockquote: {
							fontFamily: 'Georgia, Garamond, serif',
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
				hardLime: '#7EE17D'
			}
		}
	},
	plugins: [require('tailwindcss-font-inter')(), require('@tailwindcss/typography')]
};
