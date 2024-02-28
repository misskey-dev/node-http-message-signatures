module.exports = {
	root: true,
	extends: ["eslint:recommended"],
	plugins: [],
	parserOptions: {
		sourceType: "module",
	},
	env: {
		es6: true,
		browser: false,
		node: true,
	},
	globals: {},
	rules: {},
	ignorePatterns: ['**/.eslintrc.cjs'],
};
