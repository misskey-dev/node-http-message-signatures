import { genEd25519KeyPair, genRsaKeyPair, importPrivateKey } from '../../dist/index.mjs';
import bytes from 'bytes';
import { PerformanceBase } from './base.js';

const test = new PerformanceBase(50);

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
			test.start(`${type} keypairs cration(Promise.all)`);
			const keypairs = await Promise.all(new Array(test.TRYES).fill(0).map(() => genFn()));
			test.end();

			test.start(`${type} import private key and set CryptoKey`);
			for (let i = 0; i < test.TRYES; i++) {
				map.set(i, await importPrivateKey(keypairs[i].privateKey));
			}
			test.end();
		}
		const beforeGC = process.memoryUsage();
		global.gc();
		const afterGC = process.memoryUsage();
		logMemUsage('initial - before gc', initial, beforeGC);
		logMemUsage('initial - after gc', initial, afterGC);
		logMemUsage('before gc - after gc', beforeGC, afterGC);
	}
}
