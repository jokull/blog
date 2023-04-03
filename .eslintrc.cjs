/** @type {import("eslint").Linter.Config} */
module.exports = {
	root: true,
	extends: ['eslint:recommended', 'prettier'],
	plugins: ['svelte3'],

	overrides: [
		{
			files: ['*.svelte'],
			processor: 'svelte3/svelte3'
		},
		{
			files: ['*.md'],
			extends: 'plugin:mdx/recommended',
			settings: {
				'mdx/code-blocks': true
			}
		}
	],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2019
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	}
};
