import esbuild from 'esbuild';
const watch = process.argv[2]?.includes('watch');

const __dirname = new URL('.', import.meta.url).pathname;

/** @type {esbuild.BuildOptions} */
const buildOptionsBase = {
	platform: 'node',
	entryPoints: [ `${__dirname}/src/index.ts` ],
	bundle: true,
	treeShaking: true,
	minify: false,
	absWorkingDir: __dirname,
	outbase: `${__dirname}/src`,
	outdir: `${__dirname}/dist`,
	loader: {
		'.ts': 'ts'
	},
	tsconfig: `${__dirname}/tsconfig.json`,
};

(async () => {
	if (!watch) {
		await esbuild.build({
			...buildOptionsBase,
			format: 'esm',
			outExtension: { '.js': '.mjs' },
		});
		await esbuild.build({
			...buildOptionsBase,
			format: 'cjs',
			outExtension: { '.js': '.cjs' },
		});
		console.log('done');
	} else {
		await esbuild.build({
			...buildOptionsBase,
			format: 'esm',
			outExtension: { '.js': '.mjs' },
		});
		await context.watch();
		console.log('watching...');
	}
})();
