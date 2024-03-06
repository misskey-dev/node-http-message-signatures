import { genEd25519KeyPair, genRsaKeyPair, importPrivateKey } from '../../dist/index.mjs';
import bytes from 'bytes';

const COUNTS = 50;

function round3(value) {
	const pow = Math.pow(10, 3);
	return Math.round(value * pow) / pow;
}

/**
 * @param {string} name
 * @param {[number, number]} diff
 */
function logPerf(name, diff) {
	const ms = diff[0] * 1e3 + diff[1] / 1e6;
	console.log(name, '\n', round3(ms), 'ms', round3(COUNTS / (ms / 1e3)), 'ops/s');
}

function logMemUsage(name, before, after) {
	console.log(name, {
		rss: bytes(after.rss - before.rss),
		heapTotal: bytes(after.heapTotal - before.heapTotal),
		heapUsed: bytes(after.heapUsed - before.heapUsed),
		external: bytes(after.external - before.external),
		arrayBuffers: bytes(after.arrayBuffers - before.arrayBuffers),
	})
}

for (const [type, genFn] of [ ['rsa4096', genRsaKeyPair], ['ed25519', genEd25519KeyPair] ]) {
	console.log(`\n\n${type}`);
	const map = new Map();
	global.gc();
	const initial = process.memoryUsage();
	{
		{
			const startCreateKeypairs = process.hrtime();
			const keypairs = await Promise.all(new Array(COUNTS).fill(0).map(() => genFn()));
			logPerf(`${type} keypairs cration(Promise.all)`, process.hrtime(startCreateKeypairs));

			const startImport = process.hrtime();
			for (let i = 0; i < COUNTS; i++) {
				map.set(i, await importPrivateKey(keypairs[i].privateKey));
			}
			logPerf(`${type} import private key and set CryptoKey`, process.hrtime(startImport));
		}
		const beforeGC = process.memoryUsage();
		global.gc();
		const afterGC = process.memoryUsage();
		logMemUsage('initial - before gc', initial, beforeGC);
		logMemUsage('initial - after gc', initial, afterGC);
		logMemUsage('before gc - after gc', beforeGC, afterGC);
	}
}
