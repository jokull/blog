/** @type {import("@types/tailwindcss/tailwind-config").TailwindConfig} **/
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts,md}'],
	theme: {
		extend: {
			fontFamily: {
				serif: [
					'"Instrument Serif"',
					'Garamond',
					'ui-serif',
					'Georgia',
					'Cambria',
					'Times New Roman',
					'Times',
					'serif'
				]
			},
			boxShadow: {
				sm: 'var(--shadow-elevation-low)',
				DEFAULT: 'var(--shadow-elevation-medium)',
				lg: 'var(--shadow-elevation-high)'
			},
			backgroundImage: {
				smooth: 'var(--smooth-gradient)'
			},
			colors: {
				lime: 'var(--lime)'
			}
		}
	}
};
